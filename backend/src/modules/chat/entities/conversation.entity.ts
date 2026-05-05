import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Message } from './message.entity';

export enum ConversationType {
  DIRECT = 'direct',
  GROUP = 'group',
}

@Entity('conversations')
@Index(['participant1', 'participant2'], { unique: true, where: '"type" = \'direct\'' })
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: ConversationType, default: ConversationType.DIRECT })
  type: ConversationType;

  @ManyToOne(() => User, { nullable: true })
  participant1: User;

  @ManyToOne(() => User, { nullable: true })
  participant2: User;

  @Column({ type: 'simple-array', nullable: true })
  participantIds: string[]; // For group chats

  @Column({ nullable: true })
  groupName: string;

  @Column({ nullable: true })
  groupAvatarUrl: string;

  @Column({ type: 'text', nullable: true })
  lastMessageText: string;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    createdBy?: string;
    isBlocked?: boolean;
    blockedBy?: string;
  };

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
