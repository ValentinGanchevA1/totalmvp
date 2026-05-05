// src/modules/events/events.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import {
  Event,
  EventStatus,
  EventAttendee,
  AttendeeStatus,
  Poll,
  PollVote,
  Question,
  QuestionUpvote,
} from './entities';
import { CreateEventDto, UpdateEventDto, CreatePollDto, VotePollDto, CreateQuestionDto } from './dto';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(EventAttendee)
    private readonly attendeeRepository: Repository<EventAttendee>,
    @InjectRepository(Poll)
    private readonly pollRepository: Repository<Poll>,
    @InjectRepository(PollVote)
    private readonly pollVoteRepository: Repository<PollVote>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(QuestionUpvote)
    private readonly questionUpvoteRepository: Repository<QuestionUpvote>,
  ) {}

  // ==================== EVENTS ====================

  async createEvent(hostId: string, dto: CreateEventDto): Promise<Event> {
    const event = await this.eventRepository.query(`
      INSERT INTO events (
        "hostId", "title", "description", "category", "location",
        "address", "startTime", "endTime", "maxCapacity", "isPublic",
        "coverImageUrl", "metadata", "status"
      ) VALUES (
        $1, $2, $3, $4, ST_SetSRID(ST_MakePoint($5, $6), 4326)::geography,
        $7, $8, $9, $10, $11, $12, $13, 'active'
      ) RETURNING *
    `, [
      hostId,
      dto.title,
      dto.description || null,
      dto.category || 'social',
      dto.longitude,
      dto.latitude,
      dto.address || null,
      dto.startTime,
      dto.endTime,
      dto.maxCapacity || null,
      dto.isPublic !== false,
      dto.coverImageUrl || null,
      JSON.stringify({ tags: dto.tags || [], requirements: dto.requirements || [] }),
    ]);

    return event[0];
  }

  async findNearbyEvents(
    latitude: number,
    longitude: number,
    radiusKm: number = 10,
    limit: number = 20,
  ): Promise<any[]> {
    const radiusMeters = radiusKm * 1000;

    return this.eventRepository.query(`
      SELECT
        e.id,
        e.title,
        e.description,
        e.category,
        e.address,
        e."startTime",
        e."endTime",
        e."maxCapacity",
        e."isPublic",
        e."coverImageUrl",
        e.metadata,
        e.status,
        ST_Y(e.location::geometry) as latitude,
        ST_X(e.location::geometry) as longitude,
        ST_Distance(e.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance,
        u."displayName" as "hostName",
        u."avatarUrl" as "hostAvatar",
        (SELECT COUNT(*) FROM event_attendees WHERE "eventId" = e.id AND status = 'going') as "attendeeCount"
      FROM events e
      JOIN users u ON e."hostId" = u.id
      WHERE e.status = 'active'
        AND e."startTime" > NOW()
        AND ST_DWithin(e.location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
      ORDER BY e."startTime" ASC
      LIMIT $4
    `, [longitude, latitude, radiusMeters, limit]);
  }

  async findById(id: string): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id },
      relations: ['host', 'attendees', 'attendees.user'],
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async findByHost(hostId: string): Promise<Event[]> {
    return this.eventRepository.find({
      where: { hostId },
      order: { startTime: 'DESC' },
    });
  }

  async updateEvent(id: string, userId: string, dto: UpdateEventDto): Promise<Event> {
    const event = await this.findById(id);

    if (event.hostId !== userId) {
      throw new ForbiddenException('Only the host can update this event');
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const params: any[] = [id];
    let paramIndex = 2;

    if (dto.title) {
      updates.push(`"title" = $${paramIndex++}`);
      params.push(dto.title);
    }
    if (dto.description !== undefined) {
      updates.push(`"description" = $${paramIndex++}`);
      params.push(dto.description);
    }
    if (dto.category) {
      updates.push(`"category" = $${paramIndex++}`);
      params.push(dto.category);
    }
    if (dto.latitude && dto.longitude) {
      updates.push(`"location" = ST_SetSRID(ST_MakePoint($${paramIndex++}, $${paramIndex++}), 4326)::geography`);
      params.push(dto.longitude, dto.latitude);
    }
    if (dto.address !== undefined) {
      updates.push(`"address" = $${paramIndex++}`);
      params.push(dto.address);
    }
    if (dto.startTime) {
      updates.push(`"startTime" = $${paramIndex++}`);
      params.push(dto.startTime);
    }
    if (dto.endTime) {
      updates.push(`"endTime" = $${paramIndex++}`);
      params.push(dto.endTime);
    }
    if (dto.maxCapacity !== undefined) {
      updates.push(`"maxCapacity" = $${paramIndex++}`);
      params.push(dto.maxCapacity);
    }
    if (dto.isPublic !== undefined) {
      updates.push(`"isPublic" = $${paramIndex++}`);
      params.push(dto.isPublic);
    }
    if (dto.coverImageUrl !== undefined) {
      updates.push(`"coverImageUrl" = $${paramIndex++}`);
      params.push(dto.coverImageUrl);
    }
    if (dto.status) {
      updates.push(`"status" = $${paramIndex++}`);
      params.push(dto.status);
    }

    if (updates.length > 0) {
      await this.eventRepository.query(`
        UPDATE events SET ${updates.join(', ')}, "updatedAt" = NOW()
        WHERE id = $1
      `, params);
    }

    return this.findById(id);
  }

  async cancelEvent(id: string, userId: string): Promise<void> {
    const event = await this.findById(id);

    if (event.hostId !== userId) {
      throw new ForbiddenException('Only the host can cancel this event');
    }

    await this.eventRepository.update(id, { status: EventStatus.CANCELLED });
  }

  // ==================== ATTENDEES ====================

  async joinEvent(eventId: string, userId: string, status: AttendeeStatus = AttendeeStatus.GOING): Promise<EventAttendee> {
    const event = await this.findById(eventId);

    if (event.status !== EventStatus.ACTIVE) {
      throw new BadRequestException('Cannot join inactive event');
    }

    // Check capacity
    if (event.maxCapacity) {
      const goingCount = await this.attendeeRepository.count({
        where: { eventId, status: AttendeeStatus.GOING },
      });
      if (goingCount >= event.maxCapacity) {
        throw new BadRequestException('Event is at full capacity');
      }
    }

    // Upsert attendee
    const existing = await this.attendeeRepository.findOne({
      where: { eventId, userId },
    });

    if (existing) {
      existing.status = status;
      return this.attendeeRepository.save(existing);
    }

    return this.attendeeRepository.save({
      eventId,
      userId,
      status,
    });
  }

  async leaveEvent(eventId: string, userId: string): Promise<void> {
    await this.attendeeRepository.delete({ eventId, userId });
  }

  async checkIn(eventId: string, userId: string, latitude: number, longitude: number): Promise<EventAttendee> {
    const event = await this.findById(eventId);
    const attendee = await this.attendeeRepository.findOne({
      where: { eventId, userId, status: AttendeeStatus.GOING },
    });

    if (!attendee) {
      throw new BadRequestException('You are not attending this event');
    }

    // Check if within 100m of event location
    const [result] = await this.eventRepository.query(`
      SELECT ST_DWithin(
        location,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        100
      ) as "isNear"
      FROM events WHERE id = $3
    `, [longitude, latitude, eventId]);

    if (!result?.isNear) {
      throw new BadRequestException('You must be at the event location to check in');
    }

    attendee.checkedInAt = new Date();
    return this.attendeeRepository.save(attendee);
  }

  async getAttendees(eventId: string): Promise<EventAttendee[]> {
    return this.attendeeRepository.find({
      where: { eventId },
      relations: ['user'],
      order: { joinedAt: 'ASC' },
    });
  }

  // ==================== POLLS ====================

  async createPoll(eventId: string, creatorId: string, dto: CreatePollDto): Promise<Poll> {
    const event = await this.findById(eventId);

    // Only host can create polls
    if (event.hostId !== creatorId) {
      throw new ForbiddenException('Only the host can create polls');
    }

    const options = dto.options.map((opt) => ({
      id: uuidv4(),
      text: opt.text,
    }));

    const poll = this.pollRepository.create({
      eventId,
      creatorId,
      question: dto.question,
      options,
      allowMultiple: dto.allowMultiple || false,
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
    });
    return this.pollRepository.save(poll);
  }

  async getEventPolls(eventId: string): Promise<any[]> {
    const polls = await this.pollRepository.find({
      where: { eventId, isActive: true },
      order: { createdAt: 'DESC' },
    });

    // Get vote counts for each poll
    const pollsWithCounts = await Promise.all(
      polls.map(async (poll) => {
        const votes = await this.pollVoteRepository.find({ where: { pollId: poll.id } });
        const voteCounts: Record<string, number> = {};

        poll.options.forEach((opt) => {
          voteCounts[opt.id] = 0;
        });

        votes.forEach((vote) => {
          vote.optionIds.forEach((optId) => {
            if (voteCounts[optId] !== undefined) {
              voteCounts[optId]++;
            }
          });
        });

        return {
          ...poll,
          totalVotes: votes.length,
          voteCounts,
        };
      }),
    );

    return pollsWithCounts;
  }

  async votePoll(pollId: string, userId: string, dto: VotePollDto): Promise<PollVote> {
    const poll = await this.pollRepository.findOne({ where: { id: pollId } });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (!poll.isActive) {
      throw new BadRequestException('Poll is closed');
    }

    if (poll.endsAt && new Date() > poll.endsAt) {
      throw new BadRequestException('Poll has ended');
    }

    // Validate option IDs
    const validOptionIds = poll.options.map((o) => o.id);
    const invalidOptions = dto.optionIds.filter((id) => !validOptionIds.includes(id));
    if (invalidOptions.length > 0) {
      throw new BadRequestException('Invalid option IDs');
    }

    if (!poll.allowMultiple && dto.optionIds.length > 1) {
      throw new BadRequestException('Only one option allowed');
    }

    // Check existing vote
    const existingVote = await this.pollVoteRepository.findOne({
      where: { pollId, userId },
    });

    if (existingVote) {
      existingVote.optionIds = dto.optionIds;
      return this.pollVoteRepository.save(existingVote);
    }

    return this.pollVoteRepository.save({
      pollId,
      userId,
      optionIds: dto.optionIds,
    });
  }

  async closePoll(pollId: string, userId: string): Promise<void> {
    const poll = await this.pollRepository.findOne({
      where: { id: pollId },
      relations: ['event'],
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (poll.event.hostId !== userId) {
      throw new ForbiddenException('Only the host can close polls');
    }

    poll.isActive = false;
    await this.pollRepository.save(poll);
  }

  // ==================== Q&A ====================

  async createQuestion(eventId: string, askerId: string, dto: CreateQuestionDto): Promise<Question> {
    await this.findById(eventId); // Verify event exists

    return this.questionRepository.save({
      eventId,
      askerId,
      content: dto.content,
    });
  }

  async getEventQuestions(eventId: string): Promise<Question[]> {
    return this.questionRepository.find({
      where: { eventId },
      relations: ['asker'],
      order: { isPinned: 'DESC', upvotes: 'DESC', createdAt: 'ASC' },
    });
  }

  async upvoteQuestion(questionId: string, userId: string): Promise<Question> {
    const question = await this.questionRepository.findOne({ where: { id: questionId } });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const existingUpvote = await this.questionUpvoteRepository.findOne({
      where: { questionId, userId },
    });

    if (existingUpvote) {
      throw new BadRequestException('Already upvoted');
    }

    await this.questionUpvoteRepository.save({ questionId, userId });

    question.upvotes++;
    return this.questionRepository.save(question);
  }

  async removeUpvote(questionId: string, userId: string): Promise<Question> {
    const question = await this.questionRepository.findOne({ where: { id: questionId } });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const upvote = await this.questionUpvoteRepository.findOne({
      where: { questionId, userId },
    });

    if (!upvote) {
      throw new BadRequestException('Not upvoted');
    }

    await this.questionUpvoteRepository.delete({ questionId, userId });

    question.upvotes = Math.max(0, question.upvotes - 1);
    return this.questionRepository.save(question);
  }

  async markQuestionAnswered(questionId: string, userId: string): Promise<Question> {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations: ['event'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (question.event.hostId !== userId) {
      throw new ForbiddenException('Only the host can mark questions as answered');
    }

    question.isAnswered = true;
    return this.questionRepository.save(question);
  }

  async pinQuestion(questionId: string, userId: string): Promise<Question> {
    const question = await this.questionRepository.findOne({
      where: { id: questionId },
      relations: ['event'],
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    if (question.event.hostId !== userId) {
      throw new ForbiddenException('Only the host can pin questions');
    }

    question.isPinned = !question.isPinned;
    return this.questionRepository.save(question);
  }
}
