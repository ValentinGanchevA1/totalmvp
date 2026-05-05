import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum SwipeType {
  LIKE = 'like',
  PASS = 'pass',
  SUPER_LIKE = 'super_like',
}

@Entity('swipes')
@Index(['swiper', 'swiped'], { unique: true })
export class Swipe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'swiperId' })
  swiper: User;

  @Column()
  swiperId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'swipedId' })
  swiped: User;

  @Column()
  swipedId: string;

  @Column({ type: 'enum', enum: SwipeType })
  type: SwipeType;

  @CreateDateColumn()
  createdAt: Date;
}
