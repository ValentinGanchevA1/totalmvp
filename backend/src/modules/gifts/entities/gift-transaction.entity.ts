// src/modules/gifts/entities/gift-transaction.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { GiftCatalog } from './gift-catalog.entity';

export interface GiftContext {
  eventId?: string;
  chatId?: string;
  conversationId?: string;
}

@Entity('gift_transactions')
@Index(['senderId'])
@Index(['recipientId'])
@Index(['createdAt'])
export class GiftTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  senderId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @Column({ type: 'uuid' })
  recipientId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'recipientId' })
  recipient: User;

  @Column({ type: 'uuid' })
  giftId: string;

  @ManyToOne(() => GiftCatalog)
  @JoinColumn({ name: 'giftId' })
  gift: GiftCatalog;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @Column({ type: 'int' })
  coinAmount: number;

  @Column({ type: 'int' })
  creatorShare: number; // 70% to recipient

  @Column({ type: 'int' })
  platformFee: number; // 30% to platform

  @Column({ type: 'varchar', length: 500, nullable: true })
  message: string;

  @Column({ type: 'jsonb', default: {} })
  context: GiftContext;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
