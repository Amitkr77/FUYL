import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { cashbackService } from './cashback.service';
import { logger } from '../../../config/logger';

/**
 * Wires the cashback module to order lifecycle events.
 *
 * - ORDER_PLACED    → create CashbackEarning records; credit immediately if on_order timing
 * - ORDER_DELIVERED → credit on_delivery earnings
 * - ORDER_CANCELLED → reverse all earnings for the order
 */
export function registerCashbackEventSubscribers(): void {
  eventBus.on<{
    orderId: string;
    userId: string;
    subtotal: number;
    couponCode?: string;
  }>(Events.ORDER_PLACED, async (event) => {
    try {
      await cashbackService.createEarnings({
        orderId:   event.orderId,
        userId:    event.userId,
        subtotal:  event.subtotal,
        couponCode: event.couponCode,
      });
    } catch (err) {
      logger.error('[cashback.event] ORDER_PLACED handler failed', { orderId: event.orderId, err });
    }
  });

  eventBus.on<{ orderId: string; userId: string }>(Events.ORDER_DELIVERED, async (event) => {
    try {
      await cashbackService.creditDeliveryEarnings(event.orderId);
    } catch (err) {
      logger.error('[cashback.event] ORDER_DELIVERED handler failed', { orderId: event.orderId, err });
    }
  });

  eventBus.on<{ orderId: string; userId: string }>(Events.ORDER_CANCELLED, async (event) => {
    try {
      await cashbackService.reverseEarnings(event.orderId);
    } catch (err) {
      logger.error('[cashback.event] ORDER_CANCELLED handler failed', { orderId: event.orderId, err });
    }
  });

  logger.info('[cashback.event] subscribers registered');
}
