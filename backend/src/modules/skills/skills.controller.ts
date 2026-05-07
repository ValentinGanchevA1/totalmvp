import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SkillsService } from './skills.service';

@Controller('skills')
@UseGuards(JwtAuthGuard)
export class SkillsController {
  constructor(private skillsService: SkillsService) {}

  @Get(':userId')
  async getUserSkills(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: User,
    @Query('days') days: string = '30',
  ) {
    const daysBack = parseInt(days, 10);
    const history = await this.skillsService.getUserSkillsHistory(
      userId,
      currentUser.id,
      daysBack,
    );
    return { userId, history, timelineScope: `${daysBack} days` };
  }

  @Get('leaderboard/global')
  async getGlobalLeaderboard(
    @Query('skillType') skillType: 'dating' | 'social' | 'trader' | 'overall' = 'overall',
    @Query('limit') limit: string = '50',
  ) {
    const leaderboard = await this.skillsService.getGlobalLeaderboard(
      skillType,
      parseInt(limit, 10),
    );
    return { leaderboard, scope: 'global', skillType, timestamp: new Date() };
  }

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
    return { leaderboard, scope: 'city', city, skillType, timestamp: new Date() };
  }
}
