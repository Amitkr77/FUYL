import { cacheService } from './cache.service';
import { logger } from '../../config/logger';

type EventHandler<T = unknown> = (payload: T) => void | Promise<void>;

class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();

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
    const message = JSON.stringify({ event, payload });
    await cacheService.getPublisher().publish('fuyl:events', message);
    this.emitLocal(event, payload);
    logger.debug(`[eventBus] published "${event}"`);
  }

  /** Subscribe to all events from Redis pub/sub (called once at boot). */
  startRedisSubscriber(): void {
    cacheService.getSubscriber().subscribe('fuyl:events');
    cacheService.getSubscriber().on('message', (_channel, message) => {
      try {
        const { event, payload } = JSON.parse(message) as { event: string; payload: unknown };
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
