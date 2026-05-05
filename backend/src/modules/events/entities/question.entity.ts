// src/modules/events/entities/question.entity.ts
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
import { QuestionUpvote } from './question-upvote.entity';

@Entity('questions')
@Index(['eventId'])
@Index(['eventId', 'upvotes'])
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => Event, (event) => event.questions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'uuid' })
  askerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'askerId' })
  asker: User;

  @Column({ type: 'varchar', length: 1000 })
  content: string;

  @Column({ type: 'int', default: 0 })
  upvotes: number;

  @Column({ type: 'boolean', default: false })
  isAnswered: boolean;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @OneToMany(() => QuestionUpvote, (upvote) => upvote.question)
  upvoteRecords: QuestionUpvote[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
