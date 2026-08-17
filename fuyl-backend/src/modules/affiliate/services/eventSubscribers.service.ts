import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { commissionService } from './commission.service';
import { logger } from '../../../config/logger';

/**
 * Wires the affiliate module to order lifecycle events.
 *
 * ORDER_COMPLETED → create a PENDING commission for the order if it has
 *   affiliate attribution (affiliateId on the order document).
 *
 * ORDER_CANCELLED → cancel / reverse any commission tied to the order.
 */
export function registerAffiliateEventSubscribers(): void {
  // ─── Order completed → create commission ──────────────────────────────────
  eventBus.on<{
    orderId:     string;
    userId:      string;
    amount:      number;
    orderNumber: string;
  }>(Events.ORDER_COMPLETED, async (event) => {
    try {
      // Lazy-import to avoid circular deps at module load time
      const { OrderModel } = await import('../../order/models/order.model');
      const order = await OrderModel.findById(event.orderId).lean();
      if (!order?.affiliateId || !order?.affiliateAttributionId) return;

      await commissionService.createForOrder({
        orderId:       event.orderId,
        affiliateId:   order.affiliateId.toString(),
        attributionId: order.affiliateAttributionId.toString(),
        subtotal:      order.subtotal,
        grandTotal:    order.grandTotal,
        orderNumber:   order.orderNumber,
      });
    } catch (err) {
      logger.error('[affiliate.event] ORDER_COMPLETED handler failed', err);
    }
  });

  // ─── Order cancelled → cancel commission ──────────────────────────────────
  eventBus.on<{
    orderId: string;
    userId:  string;
    amount:  number;
  }>(Events.ORDER_CANCELLED, async (event) => {
    try {
      await commissionService.cancel(event.orderId, 'Order cancelled');
    } catch (err) {
      logger.error('[affiliate.event] ORDER_CANCELLED handler failed', err);
    }
  });

  logger.info('[affiliate.event] subscribers registered');
}
