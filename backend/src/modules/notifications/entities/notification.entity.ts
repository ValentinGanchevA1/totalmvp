import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  NEARBY_USER = 'nearby_user',
  MESSAGE = 'message',
  MATCH = 'match',
  GEOFENCE = 'geofence',
  VERIFICATION = 'verification',
  PAYMENT = 'payment',
  SYSTEM = 'system',
  PROMOTIONAL = 'promotional',
}

@Entity('notifications')
@Index(['user', 'createdAt'])
@Index(['user', 'isRead'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ type: 'jsonb', default: {} })
  data: {
    userId?: string;
    conversationId?: string;
    geofenceId?: string;
    verificationId?: string;
    actionUrl?: string;
    [key: string]: any;
  };

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ default: false })
  isPushed: boolean; // Sent via FCM/APNs

  @Column({ type: 'timestamp', nullable: true })
  pushedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}
