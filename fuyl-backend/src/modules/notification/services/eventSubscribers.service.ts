import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { notificationService, NotificationDispatchPayload } from './notification.service';
import { logger } from '../../../config/logger';

/**
 * Subscribes to domain events and auto-dispatches appropriate notifications.
 * This is the "fan-out" layer — modules emit raw events, this layer decides
 * who gets notified.
 */
export function registerNotificationEventSubscribers(): void {
  // USER_REGISTERED → email verification
  eventBus.on<{ userId: string; email: string; appliedReferralCode?: string }>(
    Events.USER_REGISTERED,
    async (payload) => {
      await notificationService.dispatch({
        channel: 'email',
        to: { email: payload.email, userId: payload.userId },
        template: 'email_verification',
        data: { name: payload.email },
        userId: payload.userId,
        category: 'transactional',
      });
    }
  );

  // ORDER_PLACED → order_placed email
  eventBus.on<{ orderId: string; userId: string; amount: number; isSubscriptionOrder?: boolean }>(
    Events.ORDER_PLACED,
    async (payload) => {
      await notificationService.dispatch({
        channel: 'email',
        to: { userId: payload.userId },
        template: 'order_placed',
        data: {
          orderNumber: payload.orderId.slice(-8).toUpperCase(),
          total: payload.amount,
          itemCount: 1,
          paymentMethod: 'razorpay',
          currency: '₹',
        },
        userId: payload.userId,
        category: 'transactional',
      });
    }
  );

  // ORDER_SHIPPED → order_shipped email
  eventBus.on<{ orderId: string; userId: string; trackingNumber?: string; carrier?: string }>(
    Events.ORDER_SHIPPED,
    async (payload) => {
      await notificationService.dispatch({
        channel: 'email',
        to: { userId: payload.userId },
        template: 'order_shipped',
        data: {
          orderNumber: payload.orderId.slice(-8).toUpperCase(),
          trackingNumber: payload.trackingNumber ?? 'N/A',
          carrier: payload.carrier ?? 'N/A',
        },
        userId: payload.userId,
        category: 'transactional',
      });
    }
  );

  // ORDER_DELIVERED → order_delivered email
  eventBus.on<{ orderId: string; userId: string }>(
    Events.ORDER_DELIVERED,
    async (payload) => {
      await notificationService.dispatch({
        channel: 'email',
        to: { userId: payload.userId },
        template: 'order_delivered',
        data: { orderNumber: payload.orderId.slice(-8).toUpperCase() },
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
        },
        userId: payload.userId,
        category: 'subscription',
      });
    }
  );

  // SUBSCRIPTION_CHARGED → subscription_charged email
  eventBus.on<{ subscriptionId: string; userId: string; planName: string; amount: number; cycleNumber: number; nextDeliveryDate: string }>(
    Events.SUBSCRIPTION_CHARGED,
    async (payload) => {
      await notificationService.dispatch({
        channel: 'email',
        to: { userId: payload.userId },
        template: 'subscription_charged',
        data: {
          planName: payload.planName,
          amount: payload.amount,
          cycleNumber: payload.cycleNumber,
          nextDeliveryDate: payload.nextDeliveryDate,
          currency: '₹',
        },
        userId: payload.userId,
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
          cartUrl: payload.cartUrl,
        },
        userId: payload.userId,
        category: 'marketing',
        scheduledAt: new Date(Date.now() + 60 * 60 * 1000), // delay 1 hour
      });
    }
  );

  logger.info('[notification] event subscribers registered');
}
