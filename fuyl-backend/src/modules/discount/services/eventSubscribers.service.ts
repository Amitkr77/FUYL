import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { logger } from '../../../config/logger';
import { discountService } from './discount.service';

/** Keeps discount usage counters aligned with the order lifecycle. */
export function registerDiscountEventSubscribers(): void {
  const revertOrderRedemption = async ({ orderId }: { orderId: string }) => {
    try {
      await discountService.revertRedemption(orderId);
    } catch (err) {
      logger.error('[discount.event] failed to revert discount redemption', { orderId, err });
    }
  };

  eventBus.on<{ orderId: string }>(Events.ORDER_CANCELLED, revertOrderRedemption);
  // A completed return invalidates the sale just like cancellation. The
  // service is idempotent, so duplicate lifecycle events cannot decrement a
  // coupon's usage count more than once.
  eventBus.on<{ orderId: string }>(Events.ORDER_RETURNED, revertOrderRedemption);
}
