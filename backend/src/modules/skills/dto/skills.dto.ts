import { IsOptional, IsEnum, IsString } from 'class-validator';
import { UserStatus } from '../../users/entities/user.entity';

export class SkillsVisibilityDto {
  userId: string;
  displayName: string;
  avatarUrl: string;
  status: UserStatus;
  datingScore?: number;
  socialScore?: number;
  traderScore?: number;
  overallLevel?: number;
  skillsVisible: boolean;
  skillsHistoryVisible: boolean;
}

export class GetSkillsHistoryQueryDto {
  @IsOptional()
  @IsString()
  days?: string;
}

export class GetLeaderboardQueryDto {
  @IsOptional()
  @IsEnum(['dating', 'social', 'trader', 'overall'])
  skillType?: 'dating' | 'social' | 'trader' | 'overall';

  @IsOptional()
  @IsString()
  limit?: string;
}
