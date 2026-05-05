// backend/src/common/cache.service.ts
import { Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';

@Injectable()
export class CacheService {
  private readonly defaultTtl = 300; // 5 minutes in seconds

  constructor(private readonly redisService: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    const data = await this.redisService.get(key);
    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  async set(key: string, value: unknown, ttl: number = this.defaultTtl): Promise<void> {
    const data = typeof value === 'string' ? value : JSON.stringify(value);
    await this.redisService.set(key, data, ttl);
  }

  async delete(key: string): Promise<void> {
    await this.redisService.del(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    // Get all keys matching the pattern and delete them
    const keys = await this.redisService.keys(pattern);
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => this.redisService.del(key)));
    }
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redisService.get(key);
    return result !== null;
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = this.defaultTtl,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }
}
