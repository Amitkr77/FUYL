import { cacheService } from './cache.service';
import { logger } from '../../config/logger';
import crypto from 'crypto';

type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  // Unique per running process — lets the Redis subscriber tell "an event
  // this same instance already ran via emitLocal()" apart from "an event a
  // different instance published, which only reaches us through Redis."
  private readonly instanceId = crypto.randomUUID();

  /** In-process subscription (for the same instance only). */
  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler);
    return () => this.off(event, handler);
  }

  off<T = unknown>(event: string, handler: EventHandler<T>): void {
    this.handlers.get(event)?.delete(handler as EventHandler);
  }

  /** Local in-process emit (does not go through Redis). */
  emitLocal<T = unknown>(event: string, payload: T): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const h of set) {
      Promise.resolve(h(payload)).catch((err) =>
        logger.error(`[eventBus] handler error for "${event}"`, err)
      );
    }
  }

  /** Publish to Redis pub/sub — triggers all subscribers across instances. */
  async publish<T = unknown>(event: string, payload: T): Promise<void> {
    // BUG FIXED (found in the fixing/testing pass): this used to `await`
    // the Redis publish BEFORE calling emitLocal(). The shared Redis config
    // sets `maxRetriesPerRequest: null` (required for BullMQ's blocking
    // commands), so a command issued while Redis is unreachable never
    // rejects — it just retries forever. That meant every in-process event
    // handler (notification dispatch, wallet cashback on subscription
    // charge, analytics tracking, etc.) silently never ran whenever Redis
    // was down or slow, and callers never noticed because almost every
    // `eventBus.publish()` call site in the codebase doesn't await it.
    // Confirmed live: publishing SUBSCRIPTION_CHARGED with Redis down
    // produced zero notification_logs rows even though the handler itself
    // was correct. Local handlers must not depend on cross-instance
    // fan-out succeeding, so emitLocal now runs first/unconditionally, and
    // the Redis publish is best-effort with a bounded timeout (same
    // Promise.race pattern used for the boot-time Redis ping in server.ts).
    this.emitLocal(event, payload);

    // BUG FIXED (found live once Redis was actually available to test
    // against — every earlier check in this session used a Promise.race
    // timeout fallback that masked this): startRedisSubscriber()'s message
    // handler also calls emitLocal() for every message it receives, and
    // Redis pub/sub delivers a published message back to the publisher
    // itself (this instance is subscribed to the same channel). Without
    // tagging, every event fired its handlers twice on a single-instance
    // deployment — confirmed live as duplicate order_placed notification
    // rows for the same order. The instanceId lets the subscriber recognize
    // "I already ran this one directly above" and skip it, while still
    // relaying events from *other* instances in a multi-instance deployment.
    const message = JSON.stringify({ event, payload, instanceId: this.instanceId });
    try {
      await Promise.race([
        cacheService.getPublisher().publish('fuyl:events', message),
        new Promise((_resolve, reject) => setTimeout(() => reject(new Error('Redis publish timed out after 3s')), 3000)),
      ]);
      logger.debug(`[eventBus] published "${event}"`);
    } catch (err) {
      logger.warn(`[eventBus] failed to publish "${event}" to Redis — cross-instance fan-out skipped (local handlers still ran)`, err);
    }
  }

  /** Subscribe to all events from Redis pub/sub (called once at boot). */
  startRedisSubscriber(): void {
    cacheService.getSubscriber().subscribe('fuyl:events');
    cacheService.getSubscriber().on('message', (_channel, message) => {
      try {
        const { event, payload, instanceId } = JSON.parse(message) as { event: string; payload: unknown; instanceId?: string };
        // Skip messages this same instance published — it already ran
        // emitLocal() for them synchronously inside publish(). Messages
        // with no instanceId (or a different one) come from elsewhere and
        // still need to run here.
        if (instanceId === this.instanceId) return;
        this.emitLocal(event, payload);
      } catch (err) {
        logger.error('[eventBus] failed to parse message', err);
      }
    });
    logger.info('[eventBus] Redis subscriber started');
  }
}

export const eventBus = new EventBus();

export const Events = {
  USER_REGISTERED: 'user.registered',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',

  ORDER_PLACED: 'order.placed',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_COMPLETED: 'order.completed',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_RETURNED: 'order.returned',

  PAYMENT_SUCCESS: 'payment.success',
  PAYMENT_FAILED: 'payment.failed',
  PAYMENT_REFUNDED: 'payment.refunded',

  SUBSCRIPTION_CREATED: 'subscription.created',
  SUBSCRIPTION_ACTIVATED: 'subscription.activated',
  SUBSCRIPTION_CHARGED: 'subscription.charged',
  SUBSCRIPTION_FAILED: 'subscription.failed',
  SUBSCRIPTION_PAUSED: 'subscription.paused',
  SUBSCRIPTION_RESUMED: 'subscription.resumed',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',

  REFERRAL_SHARED: 'referral.shared',
  REFERRAL_APPLIED: 'referral.applied',
  REFERRAL_ELIGIBLE: 'referral.eligible',
  REFERRAL_REWARDED: 'referral.redeemed',
  REFERRAL_REJECTED: 'referral.rejected',
  REFERRAL_FLAGGED: 'referral.flagged',

  CART_ABANDONED: 'cart.abandoned',
  REVIEW_SUBMITTED: 'review.submitted',
} as const;

export type EventType = typeof Events[keyof typeof Events];
