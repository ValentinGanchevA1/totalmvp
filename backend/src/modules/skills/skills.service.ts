import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { User, UserStatus } from '../users/entities/user.entity';
import {
  UserSkillsHistory,
  SkillChangeReason,
} from '../users/entities/user-skills-history.entity';
import { CacheService } from '../../common/cache.service';

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name);
  private readonly HISTORY_DAYS = 30;
  private readonly DELTA_THRESHOLD = 5; // Only record changes >= 5

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserSkillsHistory)
    private skillsHistoryRepository: Repository<UserSkillsHistory>,
    private cacheService: CacheService,
    private configService: ConfigService,
  ) {}

  /**
   * Recalculates skills for a specific user based on interactions
   * Called on-demand when profile is viewed + scheduled hourly
   */
  async recalculateUserSkills(userId: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) return;

    const { datingScore, socialScore, traderScore } =
      await this.calculateScores(userId);

    const overallLevel = this.calculateOverallLevel(
      datingScore,
      socialScore,
      traderScore,
    );

    // Record deltas if significant (>= 5)
    await this.recordSkillChanges(user, {
      datingScore,
      socialScore,
      traderScore,
      overallLevel,
    });

    // Update user entity
    user.datingScore = datingScore;
    user.socialScore = socialScore;
    user.traderScore = traderScore;
    user.overallLevel = overallLevel;
    user.skillsLastCalculatedAt = new Date();

    await this.usersRepository.save(user);

    // Invalidate cache
    this.cacheService.delete(`user:profile:${userId}`);
    this.cacheService.delete(`leaderboard:global`);
    this.cacheService.delete(`leaderboard:dating:global`);
    this.cacheService.delete(`leaderboard:social:global`);
    this.cacheService.delete(`leaderboard:trader:global`);
  }

  /**
   * Calculate individual skill scores based on user interactions
   */
  private async calculateScores(userId: string): Promise<{
    datingScore: number;
    socialScore: number;
    traderScore: number;
  }> {
    // These queries would join with interaction tables
    // For now, returning placeholder logic - implement based on your schema

    const datingScore = await this.calculateDatingScore(userId);
    const socialScore = await this.calculateSocialScore(userId);
    const traderScore = await this.calculateTraderScore(userId);

    return {
      datingScore: Math.min(100, Math.max(0, datingScore)),
      socialScore: Math.min(100, Math.max(0, socialScore)),
      traderScore: Math.min(100, Math.max(0, traderScore)),
    };
  }

  /**
   * Dating Score: Based on matches, message exchanges, connection depth
   * Formula: (matches * 3) + (conversations * 2) + (verification_bonus)
   */
  private async calculateDatingScore(userId: string): Promise<number> {
    // Query from matches/interactions tables
    // SELECT COUNT(*) as match_count FROM matches WHERE user1_id = userId OR user2_id = userId
    // SELECT COUNT(*) as conversation_count FROM chat_messages WHERE sender_id = userId
    // Implement actual queries based on your schema

    // Placeholder: return score between 0-100
    return 50;
  }

  /**
   * Social Score: Based on followers, event RSVPs, gift exchanges
   * Formula: (followers * 2) + (following * 1) + (event_rsvps * 3) + (gifts_sent * 2)
   */
  private async calculateSocialScore(userId: string): Promise<number> {
    // Query from social/events/gifts tables
    // SELECT COUNT(*) as follower_count FROM follows WHERE target_user_id = userId
    // SELECT COUNT(*) as following_count FROM follows WHERE user_id = userId
    // Implement actual queries based on your schema

    // Placeholder: return score between 0-100
    return 50;
  }

  /**
   * Trader Score: Based on transactions, seller ratings, dispute resolution
   * Formula: (completed_transactions * 5) + (avg_rating * 10) - (disputes * 10)
   */
  private async calculateTraderScore(userId: string): Promise<number> {
    // Query from trading/orders tables
    // SELECT COUNT(*) as transaction_count FROM orders WHERE seller_id = userId AND status = 'completed'
    // SELECT AVG(rating) as avg_rating FROM transaction_ratings WHERE seller_id = userId
    // Implement actual queries based on your schema

    // Placeholder: return score between 0-100
    return 50;
  }

  /**
   * Calculate overall level (1-10) from average of three scores
   */
  private calculateOverallLevel(
    dating: number,
    social: number,
    trader: number,
  ): number {
    const average = (dating + social + trader) / 3;
    return Math.max(1, Math.ceil(average / 10)); // Convert 0-100 to 1-10
  }

  /**
   * Record significant skill changes (delta >= 5) to history
   */
  private async recordSkillChanges(
    user: User,
    newScores: {
      datingScore: number;
      socialScore: number;
      traderScore: number;
      overallLevel: number;
    },
  ): Promise<void> {
    const changes: Array<{
      skillType: 'dating' | 'social' | 'trader';
      scoreBefore: number;
      scoreAfter: number;
      delta: number;
      reason: SkillChangeReason;
    }> = [];

    // Check dating score delta
    const datingDelta = newScores.datingScore - user.datingScore;
    if (Math.abs(datingDelta) >= this.DELTA_THRESHOLD) {
      changes.push({
        skillType: 'dating',
        scoreBefore: user.datingScore,
        scoreAfter: newScores.datingScore,
        delta: datingDelta,
        reason: datingDelta > 0 ? SkillChangeReason.MATCH_CREATED : SkillChangeReason.MATCH_LOST,
      });
    }

    // Check social score delta
    const socialDelta = newScores.socialScore - user.socialScore;
    if (Math.abs(socialDelta) >= this.DELTA_THRESHOLD) {
      changes.push({
        skillType: 'social',
        scoreBefore: user.socialScore,
        scoreAfter: newScores.socialScore,
        delta: socialDelta,
        reason: socialDelta > 0 ? SkillChangeReason.FOLLOWER_GAINED : SkillChangeReason.FOLLOWER_LOST,
      });
    }

    // Check trader score delta
    const traderDelta = newScores.traderScore - user.traderScore;
    if (Math.abs(traderDelta) >= this.DELTA_THRESHOLD) {
      changes.push({
        skillType: 'trader',
        scoreBefore: user.traderScore,
        scoreAfter: newScores.traderScore,
        delta: traderDelta,
        reason:
          traderDelta > 0
            ? SkillChangeReason.TRANSACTION_COMPLETED
            : SkillChangeReason.TRANSACTION_CANCELLED,
      });
    }

    // Save history records
    for (const change of changes) {
      const description = `${change.delta > 0 ? '+' : ''}${change.delta} ${change.skillType} from ${change.reason.replace(/_/g, ' ')}`;

      const historyEntry = new UserSkillsHistory();
      historyEntry.userId = user.id;
      historyEntry.skillType = change.skillType;
      historyEntry.scoreBefore = change.scoreBefore;
      historyEntry.scoreAfter = change.scoreAfter;
      historyEntry.delta = change.delta;
      historyEntry.reason = change.reason;
      historyEntry.description = description;
      historyEntry.isRecent = true;

      await this.skillsHistoryRepository.save(historyEntry);
    }
  }

  /**
   * Get user's skill history with visibility rules
   */
  async getUserSkillsHistory(
    userId: string,
    viewerId: string,
    daysBack: number = 30,
  ): Promise<UserSkillsHistory[]> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) return [];

    // Check visibility rules based on status
    if (!this.canViewSkills(user, viewerId)) {
      return [];
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    return this.skillsHistoryRepository.find({
      where: {
        userId,
      },
      order: { createdAt: 'DESC' },
      take: daysBack === 30 ? 100 : 1000, // Limit for recent, unlimited for all
    });
  }

  /**
   * Get global leaderboard for a skill category
   */
  async getGlobalLeaderboard(
    skillType: 'dating' | 'social' | 'trader' | 'overall',
    limit: number = 50,
  ): Promise<any[]> {
    const cacheKey = `leaderboard:${skillType}:global`;
    const cached = await this.cacheService.get<any[]>(cacheKey);

    if (cached) {
      return cached;
    }

    let query = this.usersRepository
      .createQueryBuilder('user')
      .where('user.status IN (:...statuses)', {
        statuses: [UserStatus.VERIFIED, UserStatus.PRO],
      })
      .orderBy(
        `user.${skillType === 'overall' ? 'overallLevel' : `${skillType}Score`}`,
        'DESC',
      )
      .limit(limit)
      .select([
        'user.id',
        'user.displayName',
        'user.avatarUrl',
        `user.${skillType === 'overall' ? 'overallLevel' : `${skillType}Score`}`,
        'user.status',
      ]);

    const leaderboard = await query.getRawMany();

    // Cache for 1 hour
    await this.cacheService.set(cacheKey, leaderboard, 3600);

    return leaderboard;
  }

  /**
   * Get city-based leaderboard for a skill category
   */
  async getCityLeaderboard(
    city: string,
    skillType: 'dating' | 'social' | 'trader' | 'overall',
    limit: number = 50,
  ): Promise<any[]> {
    const cacheKey = `leaderboard:${skillType}:${city.toLowerCase()}`;
    const cached = await this.cacheService.get<any[]>(cacheKey);

    if (cached) {
      return cached;
    }

    // Using PostGIS to find users in city area
    // This is a simplified query - adjust based on your city/area data model
    const query = this.usersRepository
      .createQueryBuilder('user')
      .where('user.status IN (:...statuses)', {
        statuses: [UserStatus.VERIFIED, UserStatus.PRO],
      })
      .orderBy(
        `user.${skillType === 'overall' ? 'overallLevel' : `${skillType}Score`}`,
        'DESC',
      )
      .limit(limit)
      .select([
        'user.id',
        'user.displayName',
        'user.avatarUrl',
        `user.${skillType === 'overall' ? 'overallLevel' : `${skillType}Score`}`,
        'user.status',
      ]);

    const leaderboard = await query.getRawMany();

    // Cache for 1 hour
    await this.cacheService.set(cacheKey, leaderboard, 3600);

    return leaderboard;
  }

  /**
   * Check if viewer can see skills based on target user's status
   */
  private canViewSkills(targetUser: User, viewerId: string): boolean {
    // Free users can never see skills
    if (targetUser.status === UserStatus.FREE) {
      return false;
    }

    // Incognito users hide skills unless viewer matched with them.
    // Full implementation requires injecting the Match repository and calling
    // matchRepo.findOne({ where: [{ userId: viewerId, matchedUserId: targetUser.id }, ...] }).
    // Until then, incognito users never expose their skills.
    if (targetUser.status === UserStatus.INCOGNITO) {
      return false;
    }

    // Verified and Pro users show skills to everyone
    return true;
  }

  /**
   * Scheduled task: Recalculate skills for all users daily
   * Runs at 2 AM UTC
   */
  @Cron('0 2 * * *')
  async recalculateAllUserSkills(): Promise<void> {
    this.logger.log('Starting daily skill recalculation for all users');

    const users = await this.usersRepository.find();
    let processed = 0;

    for (const user of users) {
      try {
        await this.recalculateUserSkills(user.id);
        processed++;
      } catch (error) {
        this.logger.error(
          `Failed to recalculate skills for user ${user.id}`,
          error,
        );
      }
    }

    this.logger.log(
      `Completed skill recalculation for ${processed}/${users.length} users`,
    );

    // Refresh global leaderboards after all skills updated
    await this.refreshAllLeaderboards();
  }

  /**
   * Refresh all leaderboards after skill recalculation
   */
  private async refreshAllLeaderboards(): Promise<void> {
    const skillTypes = ['dating', 'social', 'trader', 'overall'];
    const cities = ['global']; // Add actual cities as needed

    for (const skillType of skillTypes) {
      await this.getGlobalLeaderboard(
        skillType as 'dating' | 'social' | 'trader' | 'overall',
      );
      for (const city of cities) {
        // Only refresh global for now
        if (city !== 'global') {
          await this.getCityLeaderboard(
            city,
            skillType as 'dating' | 'social' | 'trader' | 'overall',
          );
        }
      }
    }
  }

  /**
   * Record a skill change directly (for external events like match, transaction)
   * Called by other modules when interactions occur
   */
  async recordSkillChange(
    userId: string,
    skillType: 'dating' | 'social' | 'trader',
    delta: number,
    reason: SkillChangeReason,
    metadata?: any,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) return;

    const currentScore =
      skillType === 'dating'
        ? user.datingScore
        : skillType === 'social'
          ? user.socialScore
          : user.traderScore;

    const newScore = Math.min(100, Math.max(0, currentScore + delta));

    // Only record if delta is significant (>= 5)
    if (Math.abs(newScore - currentScore) < this.DELTA_THRESHOLD) {
      return;
    }

    const description = `${newScore > currentScore ? '+' : ''}${newScore - currentScore} ${skillType} from ${reason.replace(/_/g, ' ')}`;

    const historyEntry = new UserSkillsHistory();
    historyEntry.userId = userId;
    historyEntry.skillType = skillType;
    historyEntry.scoreBefore = currentScore;
    historyEntry.scoreAfter = newScore;
    historyEntry.delta = newScore - currentScore;
    historyEntry.reason = reason;
    historyEntry.description = description;
    historyEntry.metadata = metadata;
    historyEntry.isRecent = true;

    await this.skillsHistoryRepository.save(historyEntry);

    // Update user score
    if (skillType === 'dating') {
      user.datingScore = newScore;
    } else if (skillType === 'social') {
      user.socialScore = newScore;
    } else {
      user.traderScore = newScore;
    }

    user.overallLevel = this.calculateOverallLevel(
      user.datingScore,
      user.socialScore,
      user.traderScore,
    );

    await this.usersRepository.save(user);
    this.cacheService.delete(`user:profile:${userId}`);
  }
}
