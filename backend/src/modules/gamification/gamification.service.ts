// src/modules/gamification/gamification.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { RedisService } from '../../common/redis.service';
import {
  Achievement,
  UserAchievement,
  Challenge,
  UserChallenge,
} from './entities';

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatarUrl: string;
  score: number;
  rank: number;
}

export type LeaderboardType = 'xp' | 'events' | 'matches' | 'gifts';
export type LeaderboardPeriod = 'weekly' | 'monthly' | 'alltime';

@Injectable()
export class GamificationService {
  constructor(
    @InjectRepository(Achievement)
    private readonly achievementRepository: Repository<Achievement>,
    @InjectRepository(UserAchievement)
    private readonly userAchievementRepository: Repository<UserAchievement>,
    @InjectRepository(Challenge)
    private readonly challengeRepository: Repository<Challenge>,
    @InjectRepository(UserChallenge)
    private readonly userChallengeRepository: Repository<UserChallenge>,
    private readonly redisService: RedisService,
  ) {}

  // ==================== ACHIEVEMENTS ====================

  async getAllAchievements(): Promise<Achievement[]> {
    return this.achievementRepository.find({
      where: { isActive: true },
      order: { category: 'ASC', rarity: 'ASC' },
    });
  }

  async getUserAchievements(userId: string): Promise<any[]> {
    const userAchievements = await this.userAchievementRepository.find({
      where: { userId },
      relations: ['achievement'],
    });

    const allAchievements = await this.getAllAchievements();

    return allAchievements.map((achievement) => {
      const userProgress = userAchievements.find(
        (ua) => ua.achievementId === achievement.id,
      );

      return {
        ...achievement,
        progress: userProgress?.progress || 0,
        unlockedAt: userProgress?.unlockedAt || null,
        isUnlocked: !!userProgress?.unlockedAt,
      };
    });
  }

  async checkAndUnlockAchievement(
    userId: string,
    achievementCode: string,
    progress?: number,
  ): Promise<UserAchievement | null> {
    const achievement = await this.achievementRepository.findOne({
      where: { code: achievementCode, isActive: true },
    });

    if (!achievement) return null;

    let userAchievement = await this.userAchievementRepository.findOne({
      where: { userId, achievementId: achievement.id },
    });

    if (!userAchievement) {
      userAchievement = this.userAchievementRepository.create({
        userId,
        achievementId: achievement.id,
        progress: 0,
      });
    }

    // Already unlocked
    if (userAchievement.unlockedAt) {
      return userAchievement;
    }

    // Update progress
    if (progress !== undefined) {
      userAchievement.progress = progress;
    } else {
      userAchievement.progress++;
    }

    // Check if criteria met
    if (userAchievement.progress >= achievement.criteria.target) {
      userAchievement.unlockedAt = new Date();

      // Award XP
      await this.addXp(userId, achievement.xpReward);
    }

    return this.userAchievementRepository.save(userAchievement);
  }

  async trackProgress(
    userId: string,
    action: string,
    count: number = 1,
  ): Promise<void> {
    // Find achievements that match this action
    const achievements = await this.achievementRepository.find({
      where: { isActive: true },
    });

    for (const achievement of achievements) {
      if (achievement.criteria.type === action) {
        await this.checkAndUnlockAchievement(userId, achievement.code);
      }
    }

    // Also track challenge progress
    await this.updateChallengeProgress(userId, action, count);
  }

  // ==================== LEADERBOARDS ====================

  async getLeaderboard(
    type: LeaderboardType,
    period: LeaderboardPeriod,
    limit: number = 100,
  ): Promise<LeaderboardEntry[]> {
    const cacheKey = `leaderboard:${type}:${period}`;

    // Try cache first
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Build leaderboard from database
    const leaderboard = await this.buildLeaderboard(type, period, limit);

    // Cache for 5 minutes
    await this.redisService.setex(cacheKey, 300, JSON.stringify(leaderboard));

    return leaderboard;
  }

  private async buildLeaderboard(
    type: LeaderboardType,
    period: LeaderboardPeriod,
    limit: number,
  ): Promise<LeaderboardEntry[]> {
    let query = '';
    const params: any[] = [limit];

    const periodFilter = this.getPeriodFilter(period);

    switch (type) {
      case 'xp':
        query = `
          SELECT
            u.id as "userId",
            u."displayName",
            u."avatarUrl",
            u.xp as score
          FROM users u
          WHERE u."isActive" = true AND u."isBanned" = false
          ORDER BY u.xp DESC
          LIMIT $1
        `;
        break;

      case 'events':
        query = `
          SELECT
            u.id as "userId",
            u."displayName",
            u."avatarUrl",
            COUNT(e.id) as score
          FROM users u
          LEFT JOIN events e ON e."hostId" = u.id
            AND e.status = 'completed'
            ${periodFilter.eventFilter}
          WHERE u."isActive" = true AND u."isBanned" = false
          GROUP BY u.id, u."displayName", u."avatarUrl"
          ORDER BY score DESC
          LIMIT $1
        `;
        break;

      case 'matches':
        query = `
          SELECT
            u.id as "userId",
            u."displayName",
            u."avatarUrl",
            COUNT(m.id) as score
          FROM users u
          LEFT JOIN matches m ON (m."user1Id" = u.id OR m."user2Id" = u.id)
            ${periodFilter.matchFilter}
          WHERE u."isActive" = true AND u."isBanned" = false
          GROUP BY u.id, u."displayName", u."avatarUrl"
          ORDER BY score DESC
          LIMIT $1
        `;
        break;

      case 'gifts':
        query = `
          SELECT
            u.id as "userId",
            u."displayName",
            u."avatarUrl",
            COALESCE(SUM(gt."coinAmount"), 0) as score
          FROM users u
          LEFT JOIN gift_transactions gt ON gt."senderId" = u.id
            ${periodFilter.giftFilter}
          WHERE u."isActive" = true AND u."isBanned" = false
          GROUP BY u.id, u."displayName", u."avatarUrl"
          ORDER BY score DESC
          LIMIT $1
        `;
        break;
    }

    const results = await this.achievementRepository.query(query, params);

    return results.map((row: any, index: number) => ({
      userId: row.userId,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      score: parseInt(row.score, 10) || 0,
      rank: index + 1,
    }));
  }

  private getPeriodFilter(period: LeaderboardPeriod): {
    eventFilter: string;
    matchFilter: string;
    giftFilter: string;
  } {
    switch (period) {
      case 'weekly':
        return {
          eventFilter: `AND e."createdAt" >= NOW() - INTERVAL '7 days'`,
          matchFilter: `AND m."matchedAt" >= NOW() - INTERVAL '7 days'`,
          giftFilter: `AND gt."createdAt" >= NOW() - INTERVAL '7 days'`,
        };
      case 'monthly':
        return {
          eventFilter: `AND e."createdAt" >= NOW() - INTERVAL '30 days'`,
          matchFilter: `AND m."matchedAt" >= NOW() - INTERVAL '30 days'`,
          giftFilter: `AND gt."createdAt" >= NOW() - INTERVAL '30 days'`,
        };
      case 'alltime':
      default:
        return {
          eventFilter: '',
          matchFilter: '',
          giftFilter: '',
        };
    }
  }

  async getUserRank(
    userId: string,
    type: LeaderboardType,
    period: LeaderboardPeriod,
  ): Promise<{ rank: number; score: number }> {
    const leaderboard = await this.getLeaderboard(type, period, 1000);
    const userEntry = leaderboard.find((e) => e.userId === userId);

    return {
      rank: userEntry?.rank || 0,
      score: userEntry?.score || 0,
    };
  }

  async updateLeaderboardScore(
    userId: string,
    type: LeaderboardType,
    score: number,
  ): Promise<void> {
    // Update Redis sorted set for real-time leaderboard
    const key = `leaderboard:realtime:${type}`;
    await this.redisService.zadd(key, score, userId);
  }

  // ==================== CHALLENGES ====================

  async getActiveChallenges(): Promise<Challenge[]> {
    const now = new Date();

    return this.challengeRepository.find({
      where: {
        isActive: true,
        startAt: LessThanOrEqual(now),
        endAt: MoreThanOrEqual(now),
      },
      order: { type: 'ASC', endAt: 'ASC' },
    });
  }

  async getUserChallenges(userId: string): Promise<any[]> {
    const activeChallenges = await this.getActiveChallenges();

    const userChallenges = await this.userChallengeRepository.find({
      where: {
        userId,
        challengeId: In(activeChallenges.map((c) => c.id)),
      },
    });

    return activeChallenges.map((challenge) => {
      const userProgress = userChallenges.find(
        (uc) => uc.challengeId === challenge.id,
      );

      return {
        ...challenge,
        progress: userProgress?.progress || 0,
        completedAt: userProgress?.completedAt || null,
        claimedAt: userProgress?.claimedAt || null,
        isCompleted: !!userProgress?.completedAt,
        isClaimed: !!userProgress?.claimedAt,
      };
    });
  }

  async updateChallengeProgress(
    userId: string,
    action: string,
    count: number = 1,
  ): Promise<void> {
    const activeChallenges = await this.getActiveChallenges();

    for (const challenge of activeChallenges) {
      if (challenge.criteria.action !== action) continue;

      let userChallenge = await this.userChallengeRepository.findOne({
        where: { userId, challengeId: challenge.id },
      });

      if (!userChallenge) {
        userChallenge = this.userChallengeRepository.create({
          userId,
          challengeId: challenge.id,
          progress: 0,
        });
      }

      // Already completed
      if (userChallenge.completedAt) continue;

      userChallenge.progress += count;

      if (userChallenge.progress >= challenge.criteria.target) {
        userChallenge.completedAt = new Date();
      }

      await this.userChallengeRepository.save(userChallenge);
    }
  }

  async claimChallengeReward(
    userId: string,
    challengeId: string,
  ): Promise<{ xp: number }> {
    const userChallenge = await this.userChallengeRepository.findOne({
      where: { userId, challengeId },
      relations: ['challenge'],
    });

    if (!userChallenge) {
      throw new NotFoundException('Challenge progress not found');
    }

    if (!userChallenge.completedAt) {
      throw new BadRequestException('Challenge not completed');
    }

    if (userChallenge.claimedAt) {
      throw new BadRequestException('Reward already claimed');
    }

    userChallenge.claimedAt = new Date();
    await this.userChallengeRepository.save(userChallenge);

    // Award XP
    const xp = userChallenge.challenge.xpReward;
    await this.addXp(userId, xp);

    return { xp };
  }

  // ==================== XP & LEVELS ====================

  async addXp(userId: string, amount: number): Promise<{ xp: number; level: number }> {
    // Update user XP and level
    const result = await this.achievementRepository.query(`
      UPDATE users
      SET
        xp = xp + $1,
        level = FLOOR(SQRT((xp + $1) / 100)) + 1
      WHERE id = $2
      RETURNING xp, level
    `, [amount, userId]);

    const { xp, level } = result[0];

    // Update leaderboard
    await this.updateLeaderboardScore(userId, 'xp', xp);

    return { xp, level };
  }

  async getUserStats(userId: string): Promise<{
    xp: number;
    level: number;
    xpToNextLevel: number;
    achievementsUnlocked: number;
    totalAchievements: number;
    challengesCompleted: number;
  }> {
    const [userResult] = await this.achievementRepository.query(`
      SELECT xp, level FROM users WHERE id = $1
    `, [userId]);

    const xp = userResult?.xp || 0;
    const level = userResult?.level || 1;

    // XP needed for next level: level^2 * 100
    const xpForCurrentLevel = Math.pow(level - 1, 2) * 100;
    const xpForNextLevel = Math.pow(level, 2) * 100;
    const xpToNextLevel = xpForNextLevel - xp;

    const achievementsUnlocked = await this.userAchievementRepository.count({
      where: { userId, unlockedAt: MoreThanOrEqual(new Date(0)) },
    });

    const totalAchievements = await this.achievementRepository.count({
      where: { isActive: true },
    });

    const challengesCompleted = await this.userChallengeRepository.count({
      where: { userId, completedAt: MoreThanOrEqual(new Date(0)) },
    });

    return {
      xp,
      level,
      xpToNextLevel: Math.max(0, xpToNextLevel),
      achievementsUnlocked,
      totalAchievements,
      challengesCompleted,
    };
  }
}
