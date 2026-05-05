// backend/src/modules/analytics/trending.service.ts
import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis.service';
import { LocationsService, NearbyUser } from '../locations/locations.service';
import * as ngeohash from 'ngeohash';

@Injectable()
export class TrendingService {
  constructor(
    private redis: RedisService,
    private locationsService: LocationsService,
  ) {}

  async trackTopic(topic: string, lat: number, lng: number) {
    const geoHash = this.getGeoHash(lat, lng, 5); // ~5km precision
    const hourKey = `trending:${geoHash}:${this.getCurrentHour()}`;

    await this.redis.zIncrBy(hourKey, 1, topic);
    await this.redis.expire(hourKey, 86400); // 24h TTL
  }

  async getTrendingTopics(lat: number, lng: number, limit = 10) {
    const geoHash = this.getGeoHash(lat, lng, 5);
    const hourKey = `trending:${geoHash}:${this.getCurrentHour()}`;

    const topics = await this.redis.zRevRangeWithScores(hourKey, 0, limit - 1);

    // Parse the WITHSCORES result (alternating topic, score)
    const result: { topic: string; count: number; velocity: number }[] = [];
    for (let i = 0; i < topics.length; i += 2) {
      const topic = topics[i];
      const score = topics[i + 1];
      result.push({
        topic,
        count: parseInt(score, 10),
        velocity: await this.calculateVelocity(topic, geoHash),
      });
    }

    return result;
  }

  async getCommunityInsights(lat: number, lng: number, radiusKm: number) {
    const users = await this.locationsService.findNearbyUsers('', lat, lng, radiusKm, 1000);

    const insights = {
      totalUsers: users.length,
      activeNow: users.filter(u => u.isOnline).length,
      demographics: this.aggregateDemographics(users),
      topInterests: this.aggregateInterests(users),
      activityHeatmap: await this.getActivityHeatmap(lat, lng, radiusKm),
    };

    return insights;
  }

  // ─── Private Helper Methods ─────────────────────────────────────────────

  private getGeoHash(lat: number, lng: number, precision: number): string {
    return ngeohash.encode(lat, lng, precision);
  }

  private getCurrentHour(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}`;
  }

  private getPreviousHour(): string {
    const now = new Date();
    now.setHours(now.getHours() - 1);
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}-${String(now.getUTCHours()).padStart(2, '0')}`;
  }

  private async calculateVelocity(topic: string, geoHash: string): Promise<number> {
    const currentHourKey = `trending:${geoHash}:${this.getCurrentHour()}`;
    const prevHourKey = `trending:${geoHash}:${this.getPreviousHour()}`;

    const currentScore = await this.redis.get(currentHourKey);
    const prevScore = await this.redis.get(prevHourKey);

    const current = currentScore ? parseInt(currentScore, 10) : 0;
    const prev = prevScore ? parseInt(prevScore, 10) : 0;

    if (prev === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - prev) / prev) * 100);
  }

  private aggregateDemographics(users: NearbyUser[]): Record<string, number> {
    const demographics: Record<string, number> = {
      total: users.length,
      verified: 0,
      highTrust: 0,
    };

    for (const user of users) {
      if (user.verificationScore >= 50) {
        demographics.verified++;
      }
      if (user.verificationScore >= 80) {
        demographics.highTrust++;
      }
    }

    return demographics;
  }

  private aggregateInterests(users: NearbyUser[]): string[] {
    // Since NearbyUser doesn't have interests, return empty array
    // In a real implementation, you'd fetch user profiles with interests
    return [];
  }

  private async getActivityHeatmap(lat: number, lng: number, radiusKm: number): Promise<Record<string, number>> {
    // Generate a simple heatmap based on user activity in the area
    const heatmap: Record<string, number> = {};

    // Create grid cells around the center point
    const cellSize = radiusKm / 5; // Divide radius into 5 cells
    for (let i = -2; i <= 2; i++) {
      for (let j = -2; j <= 2; j++) {
        const cellLat = lat + (i * cellSize * 0.009); // ~0.009 degrees per km
        const cellLng = lng + (j * cellSize * 0.009);
        const cellHash = this.getGeoHash(cellLat, cellLng, 6);

        // Get activity count from Redis (would be tracked elsewhere)
        const activityKey = `activity:${cellHash}`;
        const count = await this.redis.get(activityKey);
        heatmap[cellHash] = count ? parseInt(count, 10) : 0;
      }
    }

    return heatmap;
  }
}
