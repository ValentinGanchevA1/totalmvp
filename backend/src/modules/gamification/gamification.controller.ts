// src/modules/gamification/gamification.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  GamificationService,
  LeaderboardType,
  LeaderboardPeriod,
} from './gamification.service';

interface AuthRequest extends Request {
  user: { id: string };
}

@ApiTags('gamification')
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard)
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  // ==================== ACHIEVEMENTS ====================

  @Get('achievements')
  @ApiOperation({ summary: 'Get all achievements' })
  async getAllAchievements() {
    return this.gamificationService.getAllAchievements();
  }

  @Get('achievements/my')
  @ApiOperation({ summary: 'Get current user achievements with progress' })
  async getMyAchievements(@Req() req: AuthRequest) {
    return this.gamificationService.getUserAchievements(req.user.id);
  }

  @Get('achievements/user/:userId')
  @ApiOperation({ summary: 'Get another user\'s unlocked achievements' })
  async getUserAchievements(@Param('userId', ParseUUIDPipe) userId: string) {
    const achievements = await this.gamificationService.getUserAchievements(userId);
    // Only return unlocked achievements for other users
    return achievements.filter((a) => a.isUnlocked);
  }

  // ==================== LEADERBOARDS ====================

  @Get('leaderboard/:type')
  @ApiOperation({ summary: 'Get leaderboard by type and period' })
  async getLeaderboard(
    @Param('type') type: LeaderboardType,
    @Query('period') period: LeaderboardPeriod = 'weekly',
    @Query('limit') limit?: string,
  ) {
    const validTypes: LeaderboardType[] = ['xp', 'events', 'matches', 'gifts'];
    const validPeriods: LeaderboardPeriod[] = ['weekly', 'monthly', 'alltime'];

    if (!validTypes.includes(type)) {
      type = 'xp';
    }
    if (!validPeriods.includes(period)) {
      period = 'weekly';
    }

    return this.gamificationService.getLeaderboard(
      type,
      period,
      limit ? parseInt(limit, 10) : 100,
    );
  }

  @Get('leaderboard/:type/my-rank')
  @ApiOperation({ summary: 'Get current user rank in leaderboard' })
  async getMyRank(
    @Req() req: AuthRequest,
    @Param('type') type: LeaderboardType,
    @Query('period') period: LeaderboardPeriod = 'weekly',
  ) {
    return this.gamificationService.getUserRank(req.user.id, type, period);
  }

  // ==================== CHALLENGES ====================

  @Get('challenges')
  @ApiOperation({ summary: 'Get active challenges' })
  async getActiveChallenges() {
    return this.gamificationService.getActiveChallenges();
  }

  @Get('challenges/my')
  @ApiOperation({ summary: 'Get current user challenge progress' })
  async getMyChallenges(@Req() req: AuthRequest) {
    return this.gamificationService.getUserChallenges(req.user.id);
  }

  @Post('challenges/:challengeId/claim')
  @ApiOperation({ summary: 'Claim completed challenge reward' })
  async claimReward(
    @Req() req: AuthRequest,
    @Param('challengeId', ParseUUIDPipe) challengeId: string,
  ) {
    return this.gamificationService.claimChallengeReward(req.user.id, challengeId);
  }

  // ==================== STATS ====================

  @Get('stats/my')
  @ApiOperation({ summary: 'Get current user gamification stats' })
  async getMyStats(@Req() req: AuthRequest) {
    return this.gamificationService.getUserStats(req.user.id);
  }

  @Get('stats/user/:userId')
  @ApiOperation({ summary: 'Get another user\'s public stats' })
  async getUserStats(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.gamificationService.getUserStats(userId);
  }
}
