import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum GeofenceType {
  CIRCLE = 'circle',
  POLYGON = 'polygon',
}

export enum GeofenceTrigger {
  ENTER = 'enter',
  EXIT = 'exit',
  BOTH = 'both',
}

@Entity('geofences')
@Index(['boundary'], { spatial: true })
@Index(['isActive', 'expiresAt'])
export class Geofence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: GeofenceType, default: GeofenceType.CIRCLE })
  type: GeofenceType;

  // PostGIS geometry - can be Point (for circle) or Polygon
  @Column({
    type: 'geography',
    spatialFeatureType: 'Geometry',
    srid: 4326,
  })
  boundary: string;

  // For circle type: radius in meters
  @Column({ type: 'float', nullable: true })
  radiusMeters: number;

  // Center point for quick queries
  @Column({ type: 'float' })
  centerLatitude: number;

  @Column({ type: 'float' })
  centerLongitude: number;

  @Column({ type: 'enum', enum: GeofenceTrigger, default: GeofenceTrigger.ENTER })
  trigger: GeofenceTrigger;

  @Column({ type: 'jsonb', default: {} })
  notification: {
    title: string;
    body: string;
    imageUrl?: string;
    actionUrl?: string;
    data?: Record<string, any>;
  };

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ nullable: true })
  createdBy: string; // Admin user ID

  @Column({ type: 'jsonb', default: {} })
  metadata: {
    category?: string;
    targetAudience?: string[];
    maxTriggers?: number;
    cooldownMinutes?: number;
  };

  @Column({ type: 'int', default: 0 })
  triggerCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
