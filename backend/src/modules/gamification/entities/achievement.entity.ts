// src/modules/gamification/entities/achievement.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserAchievement } from './user-achievement.entity';

export enum AchievementCategory {
  SOCIAL = 'social',
  EVENTS = 'events',
  PROFILE = 'profile',
  PREMIUM = 'premium',
  GIFTS = 'gifts',
}

export enum Rarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

export interface AchievementCriteria {
  type: string; // 'matches', 'events_hosted', 'profile_completion', etc.
  target: number;
}

@Entity('achievements')
export class Achievement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({ type: 'varchar', length: 100 })
  icon: string;

  @Column({
    type: 'enum',
    enum: AchievementCategory,
  })
  category: AchievementCategory;

  @Column({
    type: 'enum',
    enum: Rarity,
    default: Rarity.COMMON,
  })
  rarity: Rarity;

  @Column({ type: 'int', default: 0 })
  xpReward: number;

  @Column({ type: 'jsonb', default: {} })
  criteria: AchievementCriteria;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => UserAchievement, (ua) => ua.achievement)
  userAchievements: UserAchievement[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
