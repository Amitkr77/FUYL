import rateLimit, {
  Store,
  ClientRateLimitInfo,
  Options,
} from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import IORedis from "ioredis";
import { redisConfig } from "../../config/redis";
import { env } from "../../config/env";
import { logger } from "../../config/logger";

// Dedicated Redis connection for rate limiting. The shared cache/BullMQ client
// uses `maxRetriesPerRequest: null` (commands retry forever), which would hang
// the request path if Redis went down. This one fails fast instead so a Redis
// outage degrades gracefully rather than stalling every API call.
const rateLimitRedis = new IORedis({
  ...redisConfig,
  maxRetriesPerRequest: 1,
  enableOfflineQueue: false,
});
rateLimitRedis.on("error", (err) =>
  logger.warn("[ratelimit] redis error", err.message),
);

/**
 * Wraps rate-limit-redis's store so a Redis failure FAILS OPEN (request is
 * allowed) rather than 500-ing the whole API. When Redis is up we get correct
 * cluster-wide limiting; when it's down we fall back to "no limit" for the
 * duration — strictly better than the previous per-process in-memory store,
 * and it never takes the API offline.
 */
class FailOpenStore implements Store {
  constructor(private readonly inner: Store) {}

  init(options: Options): void {
    this.inner.init?.(options);
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    try {
      return await this.inner.increment(key);
    } catch (err) {
      logger.warn(
        "[ratelimit] store unavailable — failing open",
        (err as Error).message,
      );
      // totalHits: 0 → treated as under every limit → request proceeds.
      return { totalHits: 0, resetTime: undefined };
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      await this.inner.decrement(key);
    } catch {
      /* ignore */
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      await this.inner.resetKey(key);
    } catch {
      /* ignore */
    }
  }

  async resetAll(): Promise<void> {
    try {
      await this.inner.resetAll?.();
    } catch {
      /* ignore */
    }
  }
}

function redisStore(prefix: string): Store {
  const inner = new RedisStore({
    // ioredis exposes `.call`; cast because rate-limit-redis types the spread loosely.
    sendCommand: (...args: string[]) => (rateLimitRedis as any).call(...args),
    prefix,
  });
  return new FailOpenStore(inner);
}

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProd ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  // Redis-backed limiting in prod; dev falls back to the built-in in-memory
  // MemoryStore so the server boots without a running Redis.
  store: env.isProd ? redisStore("rl:api:") : undefined,
  message: {
    success: false,
    error: { code: "TOO_MANY_REQUESTS", message: "Too many requests" },
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: env.isProd ? redisStore("rl:auth:") : undefined,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_AUTH_ATTEMPTS",
      message: "Too many auth attempts",
    },
  },
});

// Newsletter subscribe / resend-confirmation — public + unauthenticated, so
// cap it fairly tight per IP to blunt signup-spam and confirmation-email abuse.
// (A legitimate visitor subscribes once; the service also throttles repeat
// confirmation sends per-address on top of this.)
export const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: env.isProd ? redisStore("rl:newsletter:") : undefined,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many newsletter requests. Please try again later.",
    },
  },
});

export const referralApplyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: env.isProd ? redisStore("rl:ref:") : undefined,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REFERRAL_ATTEMPTS",
      message: "Too many referral applications",
    },
  },
});
