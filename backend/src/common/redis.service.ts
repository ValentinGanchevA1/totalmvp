import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      maxRetriesPerRequest: 3,
    });

    this.client.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.client.on('connect', () => {
      console.log('Redis connected');
    });
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }

  getClient(): Redis {
    return this.client;
  }

  // Geo operations
  async geoAdd(key: string, longitude: number, latitude: number, member: string): Promise<number> {
    return this.client.geoadd(key, longitude, latitude, member);
  }

  async geoRadius(
    key: string,
    longitude: number,
    latitude: number,
    radius: number,
    unit: 'km' | 'm' = 'km',
    options: { withDist?: boolean; count?: number } = {},
  ): Promise<any[]> {
    const args: (string | number)[] = [longitude, latitude, radius, unit];

    if (options.withDist) {
      args.push('WITHDIST');
    }

    if (options.count) {
      args.push('COUNT', options.count);
    }

    args.push('ASC');

    return this.client.call('GEORADIUS', key, ...args) as Promise<any[]>;
  }

  async geoRemove(key: string, member: string): Promise<number> {
    return this.client.zrem(key, member);
  }

  // Basic operations
  async set(key: string, value: string, exSeconds?: number): Promise<string | null> {
    if (exSeconds) {
      return this.client.setex(key, exSeconds, value);
    }
    return this.client.set(key, value);
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }

  async expire(key: string, seconds: number): Promise<number> {
    return this.client.expire(key, seconds);
  }

  // Set with expiry
  async setex(key: string, seconds: number, value: string): Promise<string | null> {
    return this.client.setex(key, seconds, value);
  }

  // Sorted set operations (for trending)
  async zadd(key: string, score: number, member: string): Promise<number> {
    return this.client.zadd(key, score, member);
  }

  async zIncrBy(key: string, increment: number, member: string): Promise<string> {
    return this.client.zincrby(key, increment, member);
  }

  async zRevRange(key: string, start: number, stop: number, withScores?: string): Promise<string[]> {
    if (withScores === 'WITHSCORES') {
      return this.client.zrevrange(key, start, stop, 'WITHSCORES');
    }
    return this.client.zrevrange(key, start, stop);
  }

  async zRevRangeWithScores(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.zrevrange(key, start, stop, 'WITHSCORES');
  }

  // Hash operations
  async hGetAll(key: string): Promise<Record<string, string>> {
    return this.client.hgetall(key);
  }

  async hSet(key: string, field: string, value: string): Promise<number> {
    return this.client.hset(key, field, value);
  }

  async hDel(key: string, field: string): Promise<number> {
    return this.client.hdel(key, field);
  }

  // Pub/Sub
  async publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message);
  }
}
