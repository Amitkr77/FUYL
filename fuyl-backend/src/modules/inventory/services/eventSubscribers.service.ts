import { inventoryService } from './inventory.service';
import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { logger } from '../../../config/logger';

/**
 * Wires up inventory module to react to order lifecycle events.
 * Reservations are created synchronously by checkout (reserveStock) — these
 * handlers only settle or release them once the order's fate is known.
 */
export function registerInventoryEventSubscribers(): void {
  // ─── Order shipped → convert reservation into a permanent stock deduction ──
  eventBus.on<{ orderId: string }>(Events.ORDER_SHIPPED, async (event) => {
    try {
      await inventoryService.fulfillOrder(event.orderId);
    } catch (err) {
      logger.error('[inventory.event] ORDER_SHIPPED handler failed', err);
    }
  });

  // ─── Order cancelled → release any reservations still held for it ─────────
  eventBus.on<{ orderId: string }>(Events.ORDER_CANCELLED, async (event) => {
    try {
      await inventoryService.releaseReservations({ orderId: event.orderId });
    } catch (err) {
      logger.error('[inventory.event] ORDER_CANCELLED handler failed', err);
    }
  });

  logger.info('[inventory.event] subscribers registered');
}
