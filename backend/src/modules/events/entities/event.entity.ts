// src/modules/events/entities/event.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { EventAttendee } from './event-attendee.entity';
import { Poll } from './poll.entity';
import { Question } from './question.entity';

export enum EventCategory {
  MUSIC = 'music',
  SPORTS = 'sports',
  FOOD = 'food',
  SOCIAL = 'social',
  BUSINESS = 'business',
  GAMING = 'gaming',
  FITNESS = 'fitness',
  ARTS = 'arts',
  NETWORKING = 'networking',
  OTHER = 'other',
}

export enum EventStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export interface EventMetadata {
  tags?: string[];
  requirements?: string[];
  ticketPrice?: number;
  ticketUrl?: string;
}

@Entity('events')
@Index(['status', 'startTime'])
@Index(['category'])
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  hostId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'hostId' })
  host: User;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: EventCategory,
    default: EventCategory.SOCIAL,
  })
  category: EventCategory;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string;

  @Column({ type: 'timestamptz' })
  startTime: Date;

  @Column({ type: 'timestamptz' })
  endTime: Date;

  @Column({ type: 'int', nullable: true })
  maxCapacity: number;

  @Column({ type: 'boolean', default: true })
  isPublic: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  coverImageUrl: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: EventMetadata;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.ACTIVE,
  })
  status: EventStatus;

  @OneToMany(() => EventAttendee, (attendee) => attendee.event)
  attendees: EventAttendee[];

  @OneToMany(() => Poll, (poll) => poll.event)
  polls: Poll[];

  @OneToMany(() => Question, (question) => question.event)
  questions: Question[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
