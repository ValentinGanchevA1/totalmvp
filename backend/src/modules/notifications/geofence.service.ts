// backend/src/modules/notifications/geofence.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Geofence, GeofenceTrigger } from './entities/geofence.entity';
import { RedisService } from '../../common/redis.service';

@Injectable()
export class GeofenceService {
  constructor(
    @InjectRepository(Geofence)
    private geofenceRepo: Repository<Geofence>,
    private redis: RedisService,
  ) {}

  async checkGeofences(userId: string, lat: number, lng: number) {
    const triggeredFences = await this.geofenceRepo
      .createQueryBuilder('fence')
      .where(
        `ST_Contains(fence.boundary, ST_SetSRID(ST_Point(:lng, :lat), 4326))`,
        { lat, lng },
      )
      .andWhere('fence.isActive = true')
      .getMany();

    // Get user's previous geofence states from Redis
    const prevStates = await this.redis.hGetAll(`user:${userId}:geofences`);

    for (const fence of triggeredFences) {
      const wasInside = prevStates[fence.id] === 'inside';
      const isInside = true;

      if (!wasInside && isInside && (fence.trigger === GeofenceTrigger.ENTER || fence.trigger === GeofenceTrigger.BOTH)) {
        await this.sendNotification(userId, fence, 'enter');
      }

      await this.redis.hSet(`user:${userId}:geofences`, fence.id, 'inside');
    }

    // Check for exits
    for (const [fenceId, state] of Object.entries(prevStates)) {
      if (state === 'inside' && !triggeredFences.find(f => f.id === fenceId)) {
        const fence = await this.geofenceRepo.findOne({ where: { id: fenceId } });
        if (fence && (fence.trigger === GeofenceTrigger.EXIT || fence.trigger === GeofenceTrigger.BOTH)) {
          await this.sendNotification(userId, fence, 'exit');
        }
        await this.redis.hDel(`user:${userId}:geofences`, fenceId);
      }
    }
  }

  private async sendNotification(userId: string, fence: Geofence, eventType: 'enter' | 'exit'): Promise<void> {
    // Implementation for sending notification
    // This would integrate with a notification service
    const notification = fence.notification;
    console.log(`Geofence ${eventType} notification for user ${userId}:`, notification);

    // Increment trigger count
    await this.geofenceRepo.increment({ id: fence.id }, 'triggerCount', 1);
  }

  async createGeofence(data: Partial<Geofence>): Promise<Geofence> {
    const geofence = this.geofenceRepo.create(data);
    return this.geofenceRepo.save(geofence);
  }

  async updateGeofence(id: string, data: Partial<Geofence>): Promise<Geofence | null> {
    await this.geofenceRepo.update(id, data);
    return this.geofenceRepo.findOne({ where: { id } });
  }

  async deleteGeofence(id: string): Promise<void> {
    await this.geofenceRepo.delete(id);
  }

  async getActiveGeofences(): Promise<Geofence[]> {
    return this.geofenceRepo.find({
      where: { isActive: true },
    });
  }
}
