import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { notificationService, NotificationDispatchPayload } from './notification.service';
import { logger } from '../../../config/logger';
import { env } from '../../../config/env';

/**
 * Subscribes to domain events and auto-dispatches appropriate notifications.
 * This is the "fan-out" layer — modules emit raw events, this layer decides
 * who gets notified.
 */
export function registerNotificationEventSubscribers(): void {
  // Note: email_verification is dispatched directly from
  // identity.service.ts's register() (it already has the raw verification
  // token in scope there to build a working verifyUrl) — no USER_REGISTERED
  // subscriber here, to avoid sending that email twice.

  // ORDER_PLACED → order_placed email
  //
  // BUG FIXED (found live end-to-end testing, only reproducible once Redis
  // was actually running so the notification worker could reach this data):
  // this previously fabricated orderNumber by slicing the raw Mongo _id
  // (customers would see e.g. "98BBD73A" instead of the real
  // "FUL-2026-00008"), hardcoded itemCount to 1 regardless of cart size,
  // and hardcoded paymentMethod to 'razorpay' regardless of how the order
  // was actually paid. order.service.ts's ORDER_PLACED publish calls now
  // carry the real values.
  eventBus.on<{
    orderId: string; userId: string; amount: number; isSubscriptionOrder?: boolean;
    orderNumber?: string; itemCount?: number; paymentMethod?: string;
  }>(
    Events.ORDER_PLACED,
    async (payload) => {
      await notificationService.dispatch({
        channel: 'email',
        to: { userId: payload.userId },
        template: 'order_placed',
        data: {
          orderNumber: payload.orderNumber ?? payload.orderId,
          total: payload.amount,
          itemCount: payload.itemCount ?? 1,
          paymentMethod: payload.paymentMethod ?? 'unknown',
          currency: '₹',
          orderUrl: `${env.clientUrl}/account/orders/${payload.orderId}`,
        },
        userId: payload.userId,
        category: 'transactional',
      });
    }
  );

  // ORDER_SHIPPED → order_shipped email
  //
  // BUG FIXED (same class as ORDER_PLACED above, found in the same pass):
  // fabricated a fake order number from the raw Mongo _id — order.service.ts
  // now includes the real one in the event payload.
  eventBus.on<{ orderId: string; userId: string; trackingNumber?: string; carrier?: string; orderNumber?: string }>(
    Events.ORDER_SHIPPED,
    async (payload) => {
      await notificationService.dispatch({
        channel: 'email',
        to: { userId: payload.userId },
        template: 'order_shipped',
        data: {
          orderNumber: payload.orderNumber ?? payload.orderId,
          trackingNumber: payload.trackingNumber ?? 'N/A',
          carrier: payload.carrier ?? 'N/A',
          orderUrl: `${env.clientUrl}/account/orders/${payload.orderId}`,
        },
        userId: payload.userId,
        category: 'transactional',
      });
    }
  );

  // ORDER_DELIVERED → order_delivered email
  eventBus.on<{ orderId: string; userId: string; orderNumber?: string }>(
    Events.ORDER_DELIVERED,
    async (payload) => {
      await notificationService.dispatch({
        channel: 'email',
        to: { userId: payload.userId },
        template: 'order_delivered',
        data: {
          orderNumber: payload.orderNumber ?? payload.orderId,
          orderUrl: `${env.clientUrl}/account/orders/${payload.orderId}`,
        },
        userId: payload.userId,
        category: 'transactional',
      });
    }
  );

  // SUBSCRIPTION_ACTIVATED → subscription_activated email
  eventBus.on<{ subscriptionId: string; userId: string; planName: string; amount: number; interval: string; nextDeliveryDate: string }>(
    Events.SUBSCRIPTION_ACTIVATED,
    async (payload) => {
      await notificationService.dispatch({
        channel: 'email',
        to: { userId: payload.userId },
        template: 'subscription_activated',
        data: {
          planName: payload.planName,
          amount: payload.amount,
          interval: payload.interval,
          nextDeliveryDate: payload.nextDeliveryDate,
          currency: '₹',
          manageUrl: `${env.clientUrl}/account/subscriptions`,
        },
        userId: payload.userId,
        category: 'subscription',
      });
    }
  );

  // SUBSCRIPTION_CHARGED → subscription_charged email
  //
  // BUG FIXED (found in the fixing/testing pass): this handler read
  // `payload.userId`, but razorpayWebhook.service.ts's onCharged() (the
  // only publisher of this event) has only ever sent `customerId` — same
  // field name every other SUBSCRIPTION_CHARGED subscriber (e.g. the
  // wallet cashback handler) already reads. `payload.userId` was always
  // undefined, so `to: { userId: undefined }` meant this email could never
  // resolve a recipient and silently never sent. Also picked up
  // `nextDeliveryDate`, which the publisher now includes (previously
  // omitted entirely, which would have rendered as "undefined" in the
  // template even once recipient resolution was fixed).
  eventBus.on<{ subscriptionId: string; customerId: string; amount: number; cycleNumber: number; nextDeliveryDate?: string }>(
    Events.SUBSCRIPTION_CHARGED,
    async (payload) => {
      await notificationService.dispatch({
        channel: 'email',
        to: { userId: payload.customerId },
        template: 'subscription_charged',
        data: {
          amount: payload.amount,
          cycleNumber: payload.cycleNumber,
          nextDeliveryDate: payload.nextDeliveryDate,
          currency: '₹',
          manageUrl: `${env.clientUrl}/account/subscriptions`,
        },
        userId: payload.customerId,
        category: 'subscription',
      });
    }
  );

  // SUBSCRIPTION_FAILED → subscription_failed email
  eventBus.on<{ subscriptionId: string; userId: string; planName: string; amount: number; attemptNumber: number; maxAttempts: number }>(
    Events.SUBSCRIPTION_FAILED,
    async (payload) => {
      await notificationService.dispatch({
        channel: 'email',
        to: { userId: payload.userId },
        template: 'subscription_failed',
        data: {
          planName: payload.planName,
          amount: payload.amount,
          attemptNumber: payload.attemptNumber,
          maxAttempts: payload.maxAttempts,
          currency: '₹',
          manageUrl: `${env.clientUrl}/account/subscriptions`,
        },
        userId: payload.userId,
        category: 'subscription',
      });
    }
  );

  // SUBSCRIPTION_CANCELLED → subscription_cancelled email
  eventBus.on<{ subscriptionId: string; userId: string; planName: string; endDate: string }>(
    Events.SUBSCRIPTION_CANCELLED,
    async (payload) => {
      await notificationService.dispatch({
        channel: 'email',
        to: { userId: payload.userId },
        template: 'subscription_cancelled',
        data: {
          planName: payload.planName,
          endDate: payload.endDate,
          manageUrl: `${env.clientUrl}/account/subscriptions`,
        },
        userId: payload.userId,
        category: 'subscription',
      });
    }
  );

  // REFERRAL_APPLIED → referral_applied email (to referee)
  eventBus.on<{ referralId: string; refereeId: string; code: string; refereeReward: number }>(
    Events.REFERRAL_APPLIED,
    async (payload) => {
      await notificationService.dispatch({
        channel: 'email',
        to: { userId: payload.refereeId },
        template: 'referral_applied',
        data: {
          code: payload.code,
          refereeReward: payload.refereeReward,
          walletUrl: `${env.clientUrl}/account/wallet`,
        },
        userId: payload.refereeId,
        category: 'referral',
      });
    }
  );

  // REFERRAL_REWARDED → referral_rewarded email (to referrer)
  eventBus.on<{ referralId: string; referrerId: string; amount: number; refereeName?: string }>(
    Events.REFERRAL_REWARDED,
    async (payload) => {
      await notificationService.dispatch({
        channel: 'email',
        to: { userId: payload.referrerId },
        template: 'referral_rewarded',
        data: {
          amount: payload.amount,
          refereeName: payload.refereeName ?? 'a friend',
          walletUrl: `${env.clientUrl}/account/wallet`,
        },
        userId: payload.referrerId,
        category: 'referral',
      });
    }
  );

  // CART_ABANDONED → cart_abandoned email
  eventBus.on<{ userId: string; cartId: string; itemCount: number; cartUrl?: string }>(
    Events.CART_ABANDONED,
    async (payload) => {
      await notificationService.dispatch({
        channel: 'email',
        to: { userId: payload.userId },
        template: 'cart_abandoned',
        data: {
          itemCount: payload.itemCount,
          cartUrl: payload.cartUrl ?? `${env.clientUrl}/cart`,
        },
        userId: payload.userId,
        category: 'marketing',
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000), // delay 1 hour
      });
    }
  );

  logger.info('[notification] event subscribers registered');
}
