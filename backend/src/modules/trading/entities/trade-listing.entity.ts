import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { TradeOffer } from './trade-offer.entity';
import { TradeFavorite } from './trade-favorite.entity';

export enum ListingCategory {
  CLOTHING = 'clothing',
  ELECTRONICS = 'electronics',
  COLLECTIBLES = 'collectibles',
  BOOKS = 'books',
  SPORTS = 'sports',
  HOME = 'home',
  TOYS = 'toys',
  ACCESSORIES = 'accessories',
  OTHER = 'other',
}

export enum ItemCondition {
  NEW = 'new',
  LIKE_NEW = 'like_new',
  GOOD = 'good',
  FAIR = 'fair',
  WORN = 'worn',
}

export enum ListingStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

export interface ListingMetadata {
  brand?: string;
  size?: string;
  color?: string;
  tags?: string[];
}

@Entity('trade_listings')
@Index(['status', 'category'])
@Index(['status', 'createdAt'])
export class TradeListing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  sellerId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ListingCategory })
  category: ListingCategory;

  @Column({ type: 'enum', enum: ItemCondition })
  condition: ItemCondition;

  @Column({ type: 'text', array: true, default: '{}' })
  photos: string[];

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
  })
  location: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  address: string;

  @Column({ type: 'text', nullable: true })
  lookingFor: string;

  @Column({ type: 'enum', enum: ListingStatus, default: ListingStatus.ACTIVE })
  status: ListingStatus;

  @Column({ type: 'int', default: 0 })
  viewCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date;

  @Column({ type: 'jsonb', default: {} })
  metadata: ListingMetadata;

  @OneToMany(() => TradeOffer, (offer) => offer.listing)
  offers: TradeOffer[];

  @OneToMany(() => TradeFavorite, (fav) => fav.listing)
  favorites: TradeFavorite[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
