import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, MoreThan } from 'typeorm';
import { User, SubscriptionTier } from '../users/entities/user.entity';
import { Swipe, SwipeType } from './entities/swipe.entity';
import { Match } from './entities/match.entity';

interface DiscoveryFilters {
  minAge?: number;
  maxAge?: number;
  maxDistance?: number;
  genders?: string[];
  goals?: string[];
  skip?: number;
  limit?: number;
}

@Injectable()
export class DiscoveryService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Swipe)
    private swipesRepository: Repository<Swipe>,
    @InjectRepository(Match)
    private matchesRepository: Repository<Match>,
  ) {}

async getDiscoveryProfiles(userId: string, filters: DiscoveryFilters) {
    const { minAge = 18, maxAge = 100, maxDistance = 100, skip = 0, limit = 10 } = filters;

    // Get user's current location
    const currentUser = await this.usersRepository.findOne({ where: { id: userId } });
    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    // Get users already swiped
    const swipedUserIds = await this.swipesRepository
      .createQueryBuilder('swipe')
      .select('swipe.swipedId')
      .where('swipe.swiperId = :userId', { userId })
      .getRawMany()
      .then((results) => results.map((r) => r.swipe_swipedId));

    // Build query for discovery profiles
    let query = this.usersRepository
      .createQueryBuilder('user')
      .where('"user"."id" != :userId', { userId })
      .andWhere('"user"."isActive" = true')
      .andWhere('"user"."isBanned" = false')
      .andWhere('"user"."isVisible" = true')
      .andWhere(`"user"."profile"->>'completedAt' IS NOT NULL`);

    // Exclude already swiped users
    if (swipedUserIds.length > 0) {
      query = query.andWhere('"user"."id" NOT IN (:...swipedUserIds)', { swipedUserIds });
    }

    // Age filter
    query = query
      .andWhere(`("user"."profile"->>'age')::int >= :minAge`, { minAge })
      .andWhere(`("user"."profile"->>'age')::int <= :maxAge`, { maxAge });

    // Gender filter based on user's interested_in
    if (currentUser.profile?.interestedIn) {
      query = query.andWhere(`"user"."profile"->>'gender' = :interestedIn`, {
        interestedIn: currentUser.profile.interestedIn,
      });
    }

    // Distance filter (if user has location)
    if (currentUser.lastLatitude && currentUser.lastLongitude) {
      query = query.andWhere(
        `ST_DWithin(
          "user"."location"::geography,
          ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography,
          :maxDistanceMeters
        )`,
        {
          lng: currentUser.lastLongitude,
          lat: currentUser.lastLatitude,
          maxDistanceMeters: maxDistance * 1000,
        },
      );
    }

    // Order by boosted users first, then verification score and recency
    query = query
      .addSelect(
        `CASE WHEN "user"."boostedUntil" > NOW() THEN 1 ELSE 0 END`,
        'isBoosted',
      )
      .orderBy('"isBoosted"', 'DESC')
      .addOrderBy('"user"."verificationScore"', 'DESC')
      .addOrderBy('"user"."lastSeenAt"', 'DESC')
      .skip(skip)
      .take(limit);

    const [profiles, total] = await query.getManyAndCount();

    return {
      profiles: profiles.map((p) => this.sanitizeUser(p)),
      hasMore: skip + profiles.length < total,
      total,
    };
  }

  async likeUser(swiperId: string, swipedId: string): Promise<{ matched: boolean; match?: Match }> {
    if (swiperId === swipedId) {
      throw new BadRequestException('Cannot like yourself');
    }

    // Check if already swiped
    const existingSwipe = await this.swipesRepository.findOne({
      where: { swiperId, swipedId },
    });
    if (existingSwipe) {
      throw new BadRequestException('Already swiped on this user');
    }

    // Create like swipe
    await this.swipesRepository.save({
      swiperId,
      swipedId,
      type: SwipeType.LIKE,
    });

    // Check for mutual like (match)
    const mutualLike = await this.swipesRepository.findOne({
      where: {
        swiperId: swipedId,
        swipedId: swiperId,
        type: In([SwipeType.LIKE, SwipeType.SUPER_LIKE]),
      },
    });

    if (mutualLike) {
      // Create match
      const match = await this.matchesRepository.save({
        user1Id: swiperId < swipedId ? swiperId : swipedId,
        user2Id: swiperId < swipedId ? swipedId : swiperId,
      });

      // Load match with user data
      const fullMatch = await this.matchesRepository.findOne({
        where: { id: match.id },
        relations: ['user1', 'user2'],
      });

      return { matched: true, match: fullMatch || undefined };
    }

    return { matched: false };
  }

  async passUser(swiperId: string, swipedId: string): Promise<void> {
    if (swiperId === swipedId) {
      throw new BadRequestException('Cannot pass on yourself');
    }

    const existingSwipe = await this.swipesRepository.findOne({
      where: { swiperId, swipedId },
    });
    if (existingSwipe) {
      throw new BadRequestException('Already swiped on this user');
    }

    await this.swipesRepository.save({
      swiperId,
      swipedId,
      type: SwipeType.PASS,
    });
  }

  async superLikeUser(swiperId: string, swipedId: string): Promise<{ matched: boolean; match?: Match }> {
    if (swiperId === swipedId) {
      throw new BadRequestException('Cannot super like yourself');
    }

    const existingSwipe = await this.swipesRepository.findOne({
      where: { swiperId, swipedId },
    });
    if (existingSwipe) {
      throw new BadRequestException('Already swiped on this user');
    }

    await this.swipesRepository.save({
      swiperId,
      swipedId,
      type: SwipeType.SUPER_LIKE,
    });

    // Check for mutual like
    const mutualLike = await this.swipesRepository.findOne({
      where: {
        swiperId: swipedId,
        swipedId: swiperId,
        type: In([SwipeType.LIKE, SwipeType.SUPER_LIKE]),
      },
    });

    if (mutualLike) {
      const match = await this.matchesRepository.save({
        user1Id: swiperId < swipedId ? swiperId : swipedId,
        user2Id: swiperId < swipedId ? swipedId : swiperId,
      });

      const fullMatch = await this.matchesRepository.findOne({
        where: { id: match.id },
        relations: ['user1', 'user2'],
      });

      return { matched: true, match: fullMatch || undefined };
    }

    return { matched: false };
  }

  async getMatches(userId: string) {
    const matches = await this.matchesRepository
      .createQueryBuilder('match')
      .leftJoinAndSelect('match.user1', 'user1')
      .leftJoinAndSelect('match.user2', 'user2')
      .where('(match.user1Id = :userId OR match.user2Id = :userId)', { userId })
      .andWhere(
        '(match.user1Id = :userId AND match.user1Unmatched = false) OR (match.user2Id = :userId AND match.user2Unmatched = false)',
        { userId },
      )
      .orderBy('match.matchedAt', 'DESC')
      .getMany();

    return matches.map((match) => ({
      id: match.id,
      matchedAt: match.matchedAt,
      user: this.sanitizeUser(match.user1Id === userId ? match.user2 : match.user1),
    }));
  }

  async unmatch(userId: string, matchId: string): Promise<void> {
    const match = await this.matchesRepository.findOne({
      where: { id: matchId },
    });

    if (!match) {
      throw new NotFoundException('Match not found');
    }

    if (match.user1Id !== userId && match.user2Id !== userId) {
      throw new BadRequestException('Not your match');
    }

    // Mark as unmatched for this user
    if (match.user1Id === userId) {
      await this.matchesRepository.update(matchId, { user1Unmatched: true });
    } else {
      await this.matchesRepository.update(matchId, { user2Unmatched: true });
    }
  }

  async getLikesReceived(userId: string) {
    // Premium feature: see who liked you
    const likes = await this.swipesRepository
      .createQueryBuilder('swipe')
      .leftJoinAndSelect('swipe.swiper', 'swiper')
      .where('swipe.swipedId = :userId', { userId })
      .andWhere('swipe.type IN (:...types)', { types: [SwipeType.LIKE, SwipeType.SUPER_LIKE] })
      .orderBy('swipe.createdAt', 'DESC')
      .getMany();

    // Filter out users who we already matched with
    const matchedUserIds = await this.matchesRepository
      .createQueryBuilder('match')
      .select(['match.user1Id', 'match.user2Id'])
      .where('match.user1Id = :userId OR match.user2Id = :userId', { userId })
      .getRawMany()
      .then((results) =>
        results.map((r) => (r.match_user1Id === userId ? r.match_user2Id : r.match_user1Id)),
      );

    return likes
      .filter((like) => !matchedUserIds.includes(like.swiperId))
      .map((like) => ({
        id: like.id,
        user: this.sanitizeUser(like.swiper),
        type: like.type,
        createdAt: like.createdAt,
      }));
  }

  async rewindLastSwipe(userId: string): Promise<{ profile: any } | null> {
    // Check if user has premium
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.subscriptionTier === SubscriptionTier.FREE) {
      throw new ForbiddenException('Rewind is a premium feature');
    }

    // Get the most recent swipe
    const lastSwipe = await this.swipesRepository.findOne({
      where: { swiperId: userId },
      order: { createdAt: 'DESC' },
      relations: ['swiped'],
    });

    if (!lastSwipe) {
      throw new BadRequestException('No swipes to rewind');
    }

    // Check if a match was created and delete it
    const matchToDelete = await this.matchesRepository.findOne({
      where: [
        { user1Id: userId, user2Id: lastSwipe.swipedId },
        { user1Id: lastSwipe.swipedId, user2Id: userId },
      ],
    });

    if (matchToDelete) {
      await this.matchesRepository.delete(matchToDelete.id);
    }

    // Delete the swipe
    const swipedProfile = lastSwipe.swiped;
    await this.swipesRepository.delete(lastSwipe.id);

    return { profile: this.sanitizeUser(swipedProfile) };
  }

  async activateBoost(userId: string): Promise<{ boostedUntil: Date }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.subscriptionTier === SubscriptionTier.FREE) {
      throw new ForbiddenException('Boost is a premium feature');
    }

    // Check if already boosted
    if (user.boostedUntil && user.boostedUntil > new Date()) {
      throw new BadRequestException('Profile is already boosted');
    }

    // Boost for 30 minutes
    const boostedUntil = new Date();
    boostedUntil.setMinutes(boostedUntil.getMinutes() + 30);

    await this.usersRepository.update(userId, { boostedUntil });

    return { boostedUntil };
  }

  async getBoostStatus(userId: string): Promise<{ isBoosted: boolean; boostedUntil: Date | null }> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isBoosted = user.boostedUntil && user.boostedUntil > new Date();
    return {
      isBoosted: !!isBoosted,
      boostedUntil: isBoosted ? user.boostedUntil : null,
    };
  }

  private sanitizeUser(user: User) {
    const { passwordHash, stripeCustomerId, settings, ...safeUser } = user;
    return safeUser;
  }
}
