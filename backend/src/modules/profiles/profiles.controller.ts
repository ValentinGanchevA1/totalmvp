import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SkillsService } from './skills.service';

@Controller('profiles')
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private skillsService: SkillsService) {}

  /**
   * GET /profiles/:userId/skills
   * Get user's skill scores and history with visibility rules
   */
  @Get(':userId/skills')
  async getUserSkills(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: User,
    @Query('days') days: string = '30',
  ) {
    const daysBack = parseInt(days, 10);

    // Fetch user first to validate it exists
    // In a real implementation, you'd get this from usersService
    // const user = await this.usersService.findOne(userId);

    // Get skills history
    const history = await this.skillsService.getUserSkillsHistory(
      userId,
      currentUser.id,
      daysBack,
    );

    // TODO: Fetch the user to return current scores with visibility
    // For now, return history
    return {
      userId,
      history,
      timelineScope: `${daysBack} days`,
    };
  }

  /**
   * GET /profiles/leaderboard/global
   * Get global leaderboard for all skill types
   */
  @Get('leaderboard/global')
  async getGlobalLeaderboard(
    @Query('skillType') skillType: 'dating' | 'social' | 'trader' | 'overall' = 'overall',
    @Query('limit') limit: string = '50',
  ) {
    const leaderboard = await this.skillsService.getGlobalLeaderboard(
      skillType,
      parseInt(limit, 10),
    );

    return {
      leaderboard,
      scope: 'global',
      skillType,
      timestamp: new Date(),
    };
  }

  /**
   * GET /profiles/leaderboard/city/:city
   * Get city-based leaderboard
   */
  @Get('leaderboard/city/:city')
  async getCityLeaderboard(
    @Param('city') city: string,
    @Query('skillType') skillType: 'dating' | 'social' | 'trader' | 'overall' = 'overall',
    @Query('limit') limit: string = '50',
  ) {
    const leaderboard = await this.skillsService.getCityLeaderboard(
      city,
      skillType,
      parseInt(limit, 10),
    );

    return {
      leaderboard,
      scope: 'city',
      city,
      skillType,
      timestamp: new Date(),
    };
  }
}
