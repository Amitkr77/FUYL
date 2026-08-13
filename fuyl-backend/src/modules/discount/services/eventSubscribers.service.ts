import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { logger } from '../../../config/logger';
import { discountService } from './discount.service';

/** Keeps discount usage counters aligned with the order lifecycle. */
export function registerDiscountEventSubscribers(): void {
  eventBus.on<{ orderId: string }>(Events.ORDER_CANCELLED, async ({ orderId }) => {
    try {
      await discountService.revertRedemption(orderId);
    } catch (err) {
      logger.error('[discount.event] failed to revert discount redemption', { orderId, err });
    }
  });
}
