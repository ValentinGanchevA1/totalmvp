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

@Entity('matches')
@Index(['user1Id', 'user2Id'], { unique: true })
export class Match {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user1Id' })
  user1: User;

  @Column()
  user1Id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user2Id' })
  user2: User;

  @Column()
  user2Id: string;

  @Column({ default: false })
  user1Unmatched: boolean;

  @Column({ default: false })
  user2Unmatched: boolean;

  @CreateDateColumn()
  matchedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastInteractionAt: Date;
}
