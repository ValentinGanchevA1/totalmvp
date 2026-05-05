import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { AdminUser } from './admin-user.entity';

export enum AuditAction {
  // Verification actions
  ID_APPROVED = 'id_approved',
  ID_REJECTED = 'id_rejected',
  PHOTO_APPROVED = 'photo_approved',
  PHOTO_REJECTED = 'photo_rejected',
  VERIFICATION_RESET = 'verification_reset',
  
  // User management
  USER_BANNED = 'user_banned',
  USER_UNBANNED = 'user_unbanned',
  USER_DELETED = 'user_deleted',
  
  // Content moderation
  CONTENT_REMOVED = 'content_removed',
  REPORT_RESOLVED = 'report_resolved',
  
  // Geofence management
  GEOFENCE_CREATED = 'geofence_created',
  GEOFENCE_UPDATED = 'geofence_updated',
  GEOFENCE_DELETED = 'geofence_deleted',
  
  // System
  ADMIN_LOGIN = 'admin_login',
  ADMIN_CREATED = 'admin_created',
  SETTINGS_CHANGED = 'settings_changed',
}

@Entity('audit_logs')
@Index(['action', 'createdAt'])
@Index(['targetUserId', 'createdAt'])
@Index(['admin', 'createdAt'])
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AdminUser)
  admin: AdminUser;

  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Column({ nullable: true })
  targetUserId: string;

  @Column({ nullable: true })
  targetVerificationId: string;

  @Column({ nullable: true })
  targetResourceId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    reason?: string;
    notes?: string;
    previousState?: any;
    newState?: any;
    ipAddress?: string;
    userAgent?: string;
  };

  @CreateDateColumn()
  createdAt: Date;
}
