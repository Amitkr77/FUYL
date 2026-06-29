import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { queueService } from '../../../shared/services/queue.service';
import { logger } from '../../../config/logger';

/**
 * Subscribes to domain events and dispatches analytics tracking jobs.
 */
export function registerAnalyticsEventSubscribers(): void {
  const track = (event: string, payload: any) => {
    queueService.analyticsEvent({
      event,
      userId: payload.userId ?? payload.referrerId ?? payload.refereeId,
      properties: payload,
      value: payload.amount,
      currency: 'INR',
      occurredAt: new Date(),
    });
  };

  eventBus.on(Events.USER_REGISTERED, (p: any) => track('user.registered', p));
  eventBus.on(Events.USER_LOGIN, (p: any) => track('user.login', p));
  eventBus.on(Events.ORDER_PLACED, (p: any) => track('order.placed', p));
  eventBus.on(Events.ORDER_CONFIRMED, (p: any) => track('order.confirmed', p));
  eventBus.on(Events.ORDER_SHIPPED, (p: any) => track('order.shipped', p));
  eventBus.on(Events.ORDER_DELIVERED, (p: any) => track('order.delivered', p));
  eventBus.on(Events.ORDER_COMPLETED, (p: any) => track('order.completed', p));
  eventBus.on(Events.ORDER_CANCELLED, (p: any) => track('order.cancelled', p));
  eventBus.on(Events.PAYMENT_SUCCESS, (p: any) => track('payment.success', p));
  eventBus.on(Events.PAYMENT_FAILED, (p: any) => track('payment.failed', p));
  eventBus.on(Events.PAYMENT_REFUNDED, (p: any) => track('payment.refunded', p));
  eventBus.on(Events.SUBSCRIPTION_CREATED, (p: any) => track('subscription.created', p));
  eventBus.on(Events.SUBSCRIPTION_ACTIVATED, (p: any) => track('subscription.activated', p));
  eventBus.on(Events.SUBSCRIPTION_CHARGED, (p: any) => track('subscription.charged', p));
  eventBus.on(Events.SUBSCRIPTION_FAILED, (p: any) => track('subscription.failed', p));
  eventBus.on(Events.SUBSCRIPTION_CANCELLED, (p: any) => track('subscription.cancelled', p));
  eventBus.on(Events.REFERRAL_APPLIED, (p: any) => track('referral.applied', p));
  eventBus.on(Events.REFERRAL_REWARDED, (p: any) => track('referral.redeemed', p));
  eventBus.on(Events.CART_ABANDONED, (p: any) => track('cart.abandoned', p));
  eventBus.on(Events.REVIEW_SUBMITTED, (p: any) => track('review.submitted', p));

  logger.info('[analytics] event subscribers registered');
}
