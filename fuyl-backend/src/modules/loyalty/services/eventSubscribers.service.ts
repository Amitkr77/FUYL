import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { loyaltyService } from './loyalty.service';
import { logger } from '../../../config/logger';

/**
 * Wires the loyalty module to order lifecycle events.
 *
 * - ORDER_DELIVERED  → earn points for the customer
 * - ORDER_CANCELLED  → reverse earned points AND return redeemed points
 * - ORDER_RETURNED   → same as ORDER_CANCELLED
 */
export function registerLoyaltyEventSubscribers(): void {
  eventBus.on<{
    orderId: string;
    userId: string;
    orderNumber?: string;
    subtotal?: number;
    discountTotal?: number;
    shippingTotal?: number;
    taxTotal?: number;
    walletRedemption?: number;
    grandTotal?: number;
  }>(Events.ORDER_DELIVERED, async (event) => {
    try {
      let subtotal       = event.subtotal       ?? 0;
      let discountTotal  = event.discountTotal  ?? 0;
      let shippingTotal  = event.shippingTotal  ?? 0;
      let taxTotal       = event.taxTotal       ?? 0;
      let walletRedemption = event.walletRedemption ?? 0;
      let grandTotal     = event.grandTotal     ?? 0;

      // If financial fields are missing from the event, fetch the order.
      if (!event.subtotal) {
        try {
          const { orderService } = await import('../../order/services/order.service');
          const order = await orderService.getById(event.orderId);
          subtotal        = order.subtotal        ?? 0;
          discountTotal   = order.discountTotal   ?? 0;
          shippingTotal   = order.shippingTotal   ?? 0;
          taxTotal        = order.taxTotal        ?? 0;
          walletRedemption = (order.metadata as any)?.walletRedemption ?? 0;
          grandTotal      = order.grandTotal      ?? 0;
        } catch (fetchErr) {
          logger.error('[loyalty.event] ORDER_DELIVERED — failed to fetch order for financial data', {
            orderId: event.orderId,
            err: fetchErr,
          });
          return;
        }
      }

      await loyaltyService.earnPoints({
        userId:          event.userId,
        orderId:         event.orderId,
        subtotal,
        discountTotal,
        shippingTotal,
        taxTotal,
        walletRedemption,
        grandTotal,
      });
    } catch (err) {
      logger.error('[loyalty.event] ORDER_DELIVERED handler failed', { orderId: event.orderId, err });
    }
  });

  eventBus.on<{ orderId: string; userId: string }>(Events.ORDER_CANCELLED, async (event) => {
    try {
      await loyaltyService.reverseEarn(event.orderId, event.userId);
    } catch (err) {
      logger.error('[loyalty.event] ORDER_CANCELLED reverseEarn failed', { orderId: event.orderId, err });
    }
    try {
      await loyaltyService.reverseRedeem(event.orderId, event.userId);
    } catch (err) {
      logger.error('[loyalty.event] ORDER_CANCELLED reverseRedeem failed', { orderId: event.orderId, err });
    }
  });

  eventBus.on<{ orderId: string; userId: string }>(Events.ORDER_RETURNED, async (event) => {
    try {
      await loyaltyService.reverseEarn(event.orderId, event.userId);
    } catch (err) {
      logger.error('[loyalty.event] ORDER_RETURNED reverseEarn failed', { orderId: event.orderId, err });
    }
    try {
      await loyaltyService.reverseRedeem(event.orderId, event.userId);
    } catch (err) {
      logger.error('[loyalty.event] ORDER_RETURNED reverseRedeem failed', { orderId: event.orderId, err });
    }
  });

  logger.info('[loyalty.event] subscribers registered');
}
