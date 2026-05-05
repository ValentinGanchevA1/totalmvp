import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum VerificationType {
  PHONE = 'phone',
  EMAIL = 'email',
  PHOTO = 'photo',
  ID = 'id',
  SOCIAL = 'social',
}

export enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

@Entity('verifications')
@Index(['user', 'type'])
@Index(['status', 'createdAt'])
export class Verification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.verifications, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'enum', enum: VerificationType })
  type: VerificationType;

  @Column({ type: 'enum', enum: VerificationStatus, default: VerificationStatus.PENDING })
  status: VerificationStatus;

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    // Phone verification
    phone?: string;
    code?: string; // bcrypt hashed
    codeExpiresAt?: string;
    attempts?: number;
    
    // Email verification
    email?: string;
    
    // Photo verification
    selfieUrl?: string;
    challenge?: string;
    confidenceScore?: number;
    
    // ID verification
    idDocumentUrl?: string;
    idBackUrl?: string;
    documentType?: string;
    
    // Review metadata
    reviewedBy?: string;
    reviewedAt?: string;
    rejectionReason?: string;
    reviewNotes?: string;
  };

  @Column({ type: 'timestamp', nullable: true })
  verifiedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
