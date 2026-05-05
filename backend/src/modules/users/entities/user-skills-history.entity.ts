import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum SkillChangeReason {
  MATCH_CREATED = 'match_created',
  MATCH_LOST = 'match_lost',
  MESSAGE_EXCHANGE = 'message_exchange',
  FOLLOWER_GAINED = 'follower_gained',
  FOLLOWER_LOST = 'follower_lost',
  EVENT_RSVP = 'event_rsvp',
  GIFT_SENT = 'gift_sent',
  GIFT_RECEIVED = 'gift_received',
  TRANSACTION_COMPLETED = 'transaction_completed',
  TRANSACTION_CANCELLED = 'transaction_cancelled',
  RATING_RECEIVED = 'rating_received',
  DISPUTE_RESOLVED = 'dispute_resolved',
  VERIFICATION_COMPLETED = 'verification_completed',
  STATUS_UPGRADED = 'status_upgraded',
  INACTIVITY_DECAY = 'inactivity_decay',
  MANUAL_ADJUSTMENT = 'manual_adjustment',
}

@Entity('user_skills_history')
@Index(['userId', 'createdAt'])
@Index(['userId', 'skillType'])
export class UserSkillsHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: ['dating', 'social', 'trader'] })
  skillType: 'dating' | 'social' | 'trader';

  @Column({ type: 'int' })
  scoreBefore: number; // Score before this change

  @Column({ type: 'int' })
  scoreAfter: number; // Score after this change

  @Column({ type: 'int' })
  delta: number; // scoreAfter - scoreBefore (always >= 5 in absolute value)

  @Column({ type: 'enum', enum: SkillChangeReason })
  reason: SkillChangeReason;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    // Additional context about the change
    relatedUserId?: string; // For matches, interactions
    matchCount?: number; // For dating_score changes
    followerCount?: number; // For social_score changes
    transactionId?: string; // For trader_score changes
    eventId?: string; // For event-related changes
    [key: string]: any;
  };

  @Column({ nullable: true })
  description: string; // Human-readable: "+5 dating from new match with Jane"

  @CreateDateColumn()
  createdAt: Date;

  // Convenience field for filtering last 30 days
  @Column({ type: 'boolean', default: true })
  isRecent: boolean; // true if createdAt > 30 days ago
}
