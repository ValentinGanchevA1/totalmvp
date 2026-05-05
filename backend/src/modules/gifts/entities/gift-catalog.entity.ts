// src/modules/gifts/entities/gift-catalog.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum GiftCategory {
  BASIC = 'basic',
  PREMIUM = 'premium',
  LUXURY = 'luxury',
}

@Entity('gift_catalog')
@Index(['category', 'sortOrder'])
export class GiftCatalog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  icon: string;

  @Column({
    type: 'enum',
    enum: GiftCategory,
    default: GiftCategory.BASIC,
  })
  category: GiftCategory;

  @Column({ type: 'int' })
  coinPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  usdPrice: number;

  @Column({ type: 'varchar', length: 50, default: 'default' })
  animationType: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
