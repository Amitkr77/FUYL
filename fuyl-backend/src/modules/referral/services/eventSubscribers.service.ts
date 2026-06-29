import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { referralService } from './referral.service';
import { logger } from '../../../config/logger';

/**
 * Registers all event-bus subscriptions for the referral module.
 * Called once from src/server.ts at boot.
 */
export function registerReferralEventSubscribers(): void {
  eventBus.on<{ userId: string; appliedReferralCode?: string }>(
    Events.USER_REGISTERED,
    async (event) => {
      try {
        await referralService.onUserRegistered(event);
      } catch (err) {
        logger.error('[referral.event] USER_REGISTERED handler failed', err);
      }
    }
  );

  eventBus.on<{ orderId: string; userId: string }>(
    Events.ORDER_PLACED,
    async (event) => {
      try {
        await referralService.onOrderPlaced(event);
      } catch (err) {
        logger.error('[referral.event] ORDER_PLACED handler failed', err);
      }
    }
  );

  eventBus.on<{ orderId: string; userId: string }>(
    Events.ORDER_COMPLETED,
    async (event) => {
      try {
        await referralService.onOrderCompleted(event);
      } catch (err) {
        logger.error('[referral.event] ORDER_COMPLETED handler failed', err);
      }
    }
  );

  eventBus.on<{ orderId: string; userId: string }>(
    Events.ORDER_CANCELLED,
    async (event) => {
      try {
        await referralService.onOrderCancelled(event);
      } catch (err) {
        logger.error('[referral.event] ORDER_CANCELLED handler failed', err);
      }
    }
  );

  logger.info('[referral.event] subscribers registered');
}
