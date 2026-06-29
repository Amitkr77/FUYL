import IORedis from 'ioredis';
import { redisConfig } from '../../config/redis';
import { logger } from '../../config/logger';

class CacheService {
  private client: IORedis;
  private subscriber: IORedis;
  private publisher: IORedis;
  private connected = false;

  constructor() {
    this.client = new IORedis(redisConfig);
    this.subscriber = new IORedis(redisConfig);
    this.publisher = new IORedis(redisConfig);

    this.client.on('connect', () => {
      this.connected = true;
      logger.info('[cache] Redis client connected');
    });
    this.client.on('error', (err) => logger.error('[cache] Redis client error', err));
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const v = await this.client.get(key);
    return v ? (JSON.parse(v) as T) : null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.set(key, serialized, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, serialized);
    }
  }

  async del(key: string | string[]): Promise<void> {
    if (Array.isArray(key)) {
      await this.client.del(...key);
    } else {
      await this.client.del(key);
    }
  }

  async incr(key: string, ttlSeconds?: number): Promise<number> {
    const n = await this.client.incr(key);
    if (n === 1 && ttlSeconds) {
      await this.client.expire(key, ttlSeconds);
    }
    return n;
  }

  async hset(key: string, field: string, value: unknown): Promise<void> {
    await this.client.hset(key, field, JSON.stringify(value));
  }

  async hget<T = unknown>(key: string, field: string): Promise<T | null> {
    const v = await this.client.hget(key, field);
    return v ? (JSON.parse(v) as T) : null;
  }

  async hgetall<T = unknown>(key: string): Promise<Record<string, T>> {
    const obj = await this.client.hgetall(key);
    const out: Record<string, T> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = JSON.parse(v) as T;
    }
    return out;
  }

  getClient(): IORedis { return this.client; }
  getSubscriber(): IORedis { return this.subscriber; }
  getPublisher(): IORedis { return this.publisher; }

  async disconnect(): Promise<void> {
    await Promise.allSettled([
      this.client.quit(),
      this.subscriber.quit(),
      this.publisher.quit(),
    ]);
    this.connected = false;
    logger.info('[cache] Redis disconnected');
  }
}

export const cacheService = new CacheService();
