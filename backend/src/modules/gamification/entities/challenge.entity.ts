// src/modules/gamification/entities/challenge.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UserChallenge } from './user-challenge.entity';

export enum ChallengeType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  SPECIAL = 'special',
}

export interface ChallengeCriteria {
  action: string; // 'send_message', 'join_event', 'super_like', etc.
  target: number;
  locationBound?: boolean;
}

@Entity('challenges')
@Index(['isActive', 'startAt', 'endAt'])
export class Challenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'varchar', length: 500 })
  description: string;

  @Column({
    type: 'enum',
    enum: ChallengeType,
    default: ChallengeType.DAILY,
  })
  type: ChallengeType;

  @Column({ type: 'jsonb', default: {} })
  criteria: ChallengeCriteria;

  @Column({ type: 'int', default: 0 })
  xpReward: number;

  @Column({ type: 'timestamptz' })
  startAt: Date;

  @Column({ type: 'timestamptz' })
  endAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => UserChallenge, (uc) => uc.challenge)
  userChallenges: UserChallenge[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
