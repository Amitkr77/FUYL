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
        itemQuantity:  order.items.reduce((total, item) => total + item.quantity, 0),
        items: order.items.map(item => ({ productId:item.productId.toString(), quantity:item.quantity, totalPrice:item.totalPrice, discount:item.discount, tax:item.tax })),
        shippingTotal: order.shippingTotal,
        discountTotal: order.discountTotal,
        couponCode: order.metadata?.couponCode as string | undefined,
        customerId: order.customerId.toString(),
        attributionMethod: order.affiliateAttributionMethod,
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

  eventBus.on<{
    orderId: string;
    totalRefunded: number;
    paymentAmount: number;
  }>(Events.PAYMENT_REFUNDED, async (event) => {
    try {
      await commissionService.adjustForRefund(event.orderId, event.totalRefunded, event.paymentAmount);
    } catch (err) {
      logger.error('[affiliate.event] PAYMENT_REFUNDED handler failed', err);
    }
  });

  logger.info('[affiliate.event] subscribers registered');
}
