import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { SocialLink } from './social-link.entity';
import { Verification } from './verification.entity';

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  NON_BINARY = 'non_binary',
  OTHER = 'other',
  PREFER_NOT_TO_SAY = 'prefer_not_to_say',
}

export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  VIP = 'vip',
}

export enum UserStatus {
  FREE = 'free',
  VERIFIED = 'verified',
  PRO = 'pro',
  INCOGNITO = 'incognito',
}

@Entity('users')
@Index(['email'], { unique: true, where: '"email" IS NOT NULL' })
@Index(['phone'], { unique: true, where: '"phone" IS NOT NULL' })
@Index(['location'], { spatial: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  email: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string;

  @Column({ type: 'varchar', nullable: true })
  @Exclude()
  passwordHash: string;

  @Column({ type: 'varchar', length: 50 })
  displayName: string;

  @Column({ type: 'varchar', nullable: true })
  avatarUrl: string | null;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location: string; // PostGIS Point - stored as WKT string 'POINT(lng lat)'

  @Column({ type: 'float', nullable: true })
  lastLatitude: number;

  @Column({ type: 'float', nullable: true })
  lastLongitude: number;

  @Column({ type: 'timestamp', nullable: true })
  lastLocationUpdate: Date;

  @Column({ type: 'jsonb', default: {} })
  profile: {
    bio?: string;
    age?: number;
    gender?: Gender;
    interestedIn?: Gender;
    interests?: string[];
    goals?: string[];
    photoUrls?: string[];
    height?: number;
    occupation?: string;
    education?: string;
    languages?: string[];
    completedAt?: string;
  };

  @Column({ type: 'jsonb', default: {} })
  badges: {
    phone?: boolean;
    email?: boolean;
    photo?: boolean;
    id?: boolean;
    social?: boolean;
    premium?: boolean;
  };

  @Column({ type: 'int', default: 0 })
  verificationScore: number; // 0-100

  @Column({ type: 'enum', enum: SubscriptionTier, default: SubscriptionTier.FREE })
  subscriptionTier: SubscriptionTier;

  @Column({ type: 'varchar', nullable: true })
  stripeCustomerId: string;

  @Column({ default: true })
  isVisible: boolean; // Show on map

  @Column({ default: true })
  isActive: boolean; // Account status

  @Column({ default: false })
  isBanned: boolean;

  @Column({ type: 'varchar', nullable: true })
  bannedReason: string;

  @Column({ type: 'jsonb', default: {} })
  settings: {
    notifications?: boolean;
    locationSharing?: boolean;
    showOnline?: boolean;
    distanceUnit?: 'km' | 'miles';
    language?: string;
  };

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  boostedUntil: Date;

  @Column({ type: 'int', default: 0 })
  xp: number;

  @Column({ type: 'int', default: 1 })
  level: number;

  // Skills System - Core attributes like name, photo, age
  @Column({ type: 'enum', enum: UserStatus, default: UserStatus.FREE })
  status: UserStatus; // free, verified, pro, incognito

  @Column({ type: 'int', default: 0 })
  datingScore: number; // 0-100: Based on matches, conversations, connections

  @Column({ type: 'int', default: 0 })
  socialScore: number; // 0-100: Based on followers, events, gifts, interactions

  @Column({ type: 'int', default: 0 })
  traderScore: number; // 0-100: Based on transactions, ratings, disputes

  @Column({ type: 'int', default: 1 })
  overallLevel: number; // 1-10: Derived from average of three scores

  @Column({ type: 'timestamp', nullable: true })
  skillsLastCalculatedAt: Date; // When skills were last recalculated

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => SocialLink, (link) => link.user)
  socialLinks: SocialLink[];

  @OneToMany(() => Verification, (verification) => verification.user)
  verifications: Verification[];
}
