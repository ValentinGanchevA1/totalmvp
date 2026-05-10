import { UserStatus } from '../entities/user.entity';

export class UserProfileDto {
  id: string;
  displayName: string;
  avatarUrl: string;
  status: UserStatus;
  createdAt: Date;
  bio?: string;
  age?: number;
  gender?: string;
  interestedIn?: string;
  interests?: string[];
  datingScore?: number;
  socialScore?: number;
  traderScore?: number;
  overallLevel?: number;
  verificationScore?: number;
  badges?: any;
  completedAt?: string;
}
