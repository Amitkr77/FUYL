import { schedule } from '../../../config/scheduler';
import { inventoryService } from './inventory.service';
import { logger } from '../../../config/logger';

export function registerInventorySchedulers(): void {
  // Every 5 minutes, expire stale reservations
  schedule('inventory.expireReservations', '*/5 * * * *', async () => {
    logger.debug('[scheduler] inventory.expireReservations tick');
    try {
      const n = await inventoryService.expireStaleReservations();
      if (n > 0) logger.info(`[scheduler] expired ${n} reservations`);
    } catch (err) {
      logger.error('[scheduler] inventory.expireReservations failed', err);
    }
  });

  // Daily at 6am — list low stock for reordering
  schedule('inventory.lowStockScan', '0 6 * * *', async () => {
    logger.debug('[scheduler] inventory.lowStockScan tick');
    try {
      const low = await inventoryService.listLowStock(500);
      if (low.length > 0) {
        logger.info(`[scheduler] ${low.length} low-stock items detected`);
        // Could publish event for replenishment module
      }
    } catch (err) {
      logger.error('[scheduler] inventory.lowStockScan failed', err);
    }
  });
}
