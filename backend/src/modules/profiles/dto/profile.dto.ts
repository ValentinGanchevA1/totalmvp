import { IsOptional, IsEnum, IsString } from 'class-validator';
import { UserStatus } from '../../users/entities/user.entity';

export class UserProfileDto {
  id: string;
  displayName: string;
  avatarUrl: string;
  status: UserStatus;
  createdAt: Date;

  // Skills - conditionally included based on status
  datingScore?: number;
  socialScore?: number;
  traderScore?: number;
  overallLevel?: number;

  // Profile details
  bio?: string;
  age?: number;
  gender?: string;
  interestedIn?: string[];
  interests?: string[];

  // For verified/pro users
  verificationScore?: number;
  badges?: any;
}

export class SkillsVisibilityDto {
  userId: string;
  displayName: string;
  avatarUrl: string;
  status: UserStatus;

  // Skills visibility based on status
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
  days?: string; // Number of days to look back (default 30)
}

export class GetLeaderboardQueryDto {
  @IsOptional()
  @IsEnum(['dating', 'social', 'trader', 'overall'])
  skillType?: 'dating' | 'social' | 'trader' | 'overall';

  @IsOptional()
  @IsString()
  limit?: string; // Number of entries (default 50)
}
