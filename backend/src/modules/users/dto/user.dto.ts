import { UserStatus, SubscriptionTier } from '../entities/user.entity';

export interface UserBadges {
  phone?: boolean;
  email?: boolean;
  photo?: boolean;
  id?: boolean;
  social?: boolean;
  premium?: boolean;
}

export class UserProfileDto {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  status: UserStatus;
  isVisible: boolean;
  isActive: boolean;
  subscriptionTier: SubscriptionTier;
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
  badges?: UserBadges;
  completedAt?: string;
}
