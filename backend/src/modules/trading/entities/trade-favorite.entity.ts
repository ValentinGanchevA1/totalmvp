import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TradeListing } from './trade-listing.entity';

@Entity('trade_favorites')
@Unique(['userId', 'listingId'])
@Index(['userId'])
export class TradeFavorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  listingId: string;

  @ManyToOne(() => TradeListing, (listing) => listing.favorites, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listingId' })
  listing: TradeListing;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
