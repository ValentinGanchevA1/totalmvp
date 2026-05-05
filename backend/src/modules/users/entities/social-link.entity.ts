import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum SocialProvider {
  GOOGLE = 'google',
  APPLE = 'apple',
  FACEBOOK = 'facebook',
  TWITTER = 'twitter',
  INSTAGRAM = 'instagram',
  LINKEDIN = 'linkedin',
  TIKTOK = 'tiktok',
}

@Entity('social_links')
@Index(['provider', 'providerId'], { unique: true })
export class SocialLink {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.socialLinks, { onDelete: 'CASCADE' })
  user: User;

  @Column({ type: 'enum', enum: SocialProvider })
  provider: SocialProvider;

  @Column()
  providerId: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  displayName: string;

  @Column({ nullable: true })
  profileUrl: string;

  @Column({ nullable: true })
  avatarUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: string;
    followers?: number;
    verified?: boolean;
    username?: string;
  };

  @Column({ default: true })
  isVisible: boolean;

  @CreateDateColumn()
  linkedAt: Date;
}
