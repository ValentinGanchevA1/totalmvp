// src/modules/events/entities/poll.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Event } from './event.entity';
import { PollVote } from './poll-vote.entity';

export interface PollOption {
  id: string;
  text: string;
}

@Entity('polls')
@Index(['eventId'])
export class Poll {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, (event) => event.polls, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'uuid' })
  creatorId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'creatorId' })
  creator: User;

  @Column({ type: 'varchar', length: 500 })
  question: string;

  @Column({ type: 'jsonb', default: [] })
  options: PollOption[];

  @Column({ type: 'boolean', default: false })
  allowMultiple: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  endsAt: Date;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => PollVote, (vote) => vote.poll)
  votes: PollVote[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
