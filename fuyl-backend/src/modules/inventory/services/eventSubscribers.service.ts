import { inventoryService } from './inventory.service';
import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { logger } from '../../../config/logger';
import { InventoryStockRepository } from '../repositories/stock.repository';

const stockRepo = new InventoryStockRepository();

/**
 * Wires up inventory module to react to order lifecycle events.
 * Reservations are created synchronously by checkout (reserveStock) — these
 * handlers only settle or release them once the order's fate is known.
 */
export function registerInventoryEventSubscribers(): void {
  // ─── Order shipped → convert reservation into a permanent stock deduction ──
  eventBus.on<{ orderId: string; orderNumber?: string }>(Events.ORDER_SHIPPED, async (event) => {
    try {
      await inventoryService.fulfillOrder(event.orderId, event.orderNumber);
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

  // ─── Product created → seed a zero-stock record so it appears in inventory ──
  eventBus.on<{ productId: string; sellerId: string }>(Events.PRODUCT_CREATED, async (event) => {
    try {
      await stockRepo.findOrCreate(event.productId, event.sellerId);
      logger.info(`[inventory.event] seeded stock record for product ${event.productId}`);
    } catch (err) {
      logger.error('[inventory.event] PRODUCT_CREATED handler failed', err);
    }
  });

  // ─── Variant created → seed a zero-stock record for the variant ───────────
  eventBus.on<{ productId: string; variantId: string; sellerId: string }>(Events.VARIANT_CREATED, async (event) => {
    try {
      await stockRepo.findOrCreate(event.productId, event.sellerId, event.variantId);
      logger.info(`[inventory.event] seeded stock record for variant ${event.variantId}`);
    } catch (err) {
      logger.error('[inventory.event] VARIANT_CREATED handler failed', err);
    }
  });

  logger.info('[inventory.event] subscribers registered');
}
