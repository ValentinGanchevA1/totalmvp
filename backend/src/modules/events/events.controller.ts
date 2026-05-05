// src/modules/events/events.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EventsService } from './events.service';
import { CreateEventDto, UpdateEventDto, CreatePollDto, VotePollDto, CreateQuestionDto } from './dto';
import { AttendeeStatus } from './entities';

interface AuthRequest extends Request {
  user: { id: string };
}

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
@UseGuards(JwtAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  // ==================== EVENTS ====================

  @Post()
  @ApiOperation({ summary: 'Create a new event' })
  async createEvent(@Req() req: AuthRequest, @Body() dto: CreateEventDto) {
    return this.eventsService.createEvent(req.user.id, dto);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Get nearby events' })
  async getNearbyEvents(
    @Query('latitude') latitude: string,
    @Query('longitude') longitude: string,
    @Query('radius') radius?: string,
    @Query('limit') limit?: string,
  ) {
    return this.eventsService.findNearbyEvents(
      parseFloat(latitude),
      parseFloat(longitude),
      radius ? parseFloat(radius) : 10,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('my')
  @ApiOperation({ summary: 'Get events hosted by current user' })
  async getMyEvents(@Req() req: AuthRequest) {
    return this.eventsService.findByHost(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event details' })
  async getEvent(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update event' })
  async updateEvent(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.updateEvent(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Cancel event' })
  async cancelEvent(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.eventsService.cancelEvent(id, req.user.id);
    return { success: true };
  }

  // ==================== ATTENDEES ====================

  @Post(':id/join')
  @ApiOperation({ summary: 'Join an event' })
  async joinEvent(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status?: AttendeeStatus,
  ) {
    return this.eventsService.joinEvent(id, req.user.id, status);
  }

  @Delete(':id/leave')
  @ApiOperation({ summary: 'Leave an event' })
  async leaveEvent(@Req() req: AuthRequest, @Param('id', ParseUUIDPipe) id: string) {
    await this.eventsService.leaveEvent(id, req.user.id);
    return { success: true };
  }

  @Post(':id/checkin')
  @ApiOperation({ summary: 'Check in at event location' })
  async checkIn(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body('latitude') latitude: number,
    @Body('longitude') longitude: number,
  ) {
    return this.eventsService.checkIn(id, req.user.id, latitude, longitude);
  }

  @Get(':id/attendees')
  @ApiOperation({ summary: 'Get event attendees' })
  async getAttendees(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.getAttendees(id);
  }

  // ==================== POLLS ====================

  @Post(':id/polls')
  @ApiOperation({ summary: 'Create a poll for an event' })
  async createPoll(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePollDto,
  ) {
    return this.eventsService.createPoll(id, req.user.id, dto);
  }

  @Get(':id/polls')
  @ApiOperation({ summary: 'Get event polls' })
  async getPolls(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.getEventPolls(id);
  }

  @Post('polls/:pollId/vote')
  @ApiOperation({ summary: 'Vote on a poll' })
  async votePoll(
    @Req() req: AuthRequest,
    @Param('pollId', ParseUUIDPipe) pollId: string,
    @Body() dto: VotePollDto,
  ) {
    return this.eventsService.votePoll(pollId, req.user.id, dto);
  }

  @Put('polls/:pollId/close')
  @ApiOperation({ summary: 'Close a poll' })
  async closePoll(@Req() req: AuthRequest, @Param('pollId', ParseUUIDPipe) pollId: string) {
    await this.eventsService.closePoll(pollId, req.user.id);
    return { success: true };
  }

  // ==================== Q&A ====================

  @Post(':id/questions')
  @ApiOperation({ summary: 'Ask a question' })
  async createQuestion(
    @Req() req: AuthRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.eventsService.createQuestion(id, req.user.id, dto);
  }

  @Get(':id/questions')
  @ApiOperation({ summary: 'Get event questions' })
  async getQuestions(@Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.getEventQuestions(id);
  }

  @Post('questions/:questionId/upvote')
  @ApiOperation({ summary: 'Upvote a question' })
  async upvoteQuestion(
    @Req() req: AuthRequest,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ) {
    return this.eventsService.upvoteQuestion(questionId, req.user.id);
  }

  @Delete('questions/:questionId/upvote')
  @ApiOperation({ summary: 'Remove upvote from question' })
  async removeUpvote(
    @Req() req: AuthRequest,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ) {
    return this.eventsService.removeUpvote(questionId, req.user.id);
  }

  @Put('questions/:questionId/answer')
  @ApiOperation({ summary: 'Mark question as answered' })
  async markAnswered(
    @Req() req: AuthRequest,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ) {
    return this.eventsService.markQuestionAnswered(questionId, req.user.id);
  }

  @Put('questions/:questionId/pin')
  @ApiOperation({ summary: 'Toggle pin status of question' })
  async pinQuestion(
    @Req() req: AuthRequest,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ) {
    return this.eventsService.pinQuestion(questionId, req.user.id);
  }
}
