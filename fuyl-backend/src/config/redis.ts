import { env } from './env';
import { logger } from './logger';

export const redisConfig = {
  host: env.redis.host,
  port: env.redis.port,
  username: env.redis.username,
  password: env.redis.password,
  db: env.redis.db,
  ...(env.redis.tls ? { tls: { servername: env.redis.host } } : {}),
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  lazyConnect: false,
  retryStrategy(times: number): number {
    const delay = Math.min(times * 500, 5000);
    logger.warn(`[redis] retrying in ${delay}ms (attempt ${times})`);
    return delay;
  },
} as const;
