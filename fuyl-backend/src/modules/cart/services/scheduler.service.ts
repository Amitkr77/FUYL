import { schedule } from '../../../config/scheduler';
import { cartService } from './cart.service';
import { logger } from '../../../config/logger';

export function registerCartSchedulers(): void {
  // Every 15 minutes, scan for abandoned carts
  schedule('cart.abandonedScan', '*/15 * * * *', async () => {
    logger.debug('[scheduler] cart.abandonedScan tick');
    try {
      const n = await cartService.scanAbandonedCarts();
      if (n > 0) logger.info(`[scheduler] cart.abandonedScan emitted ${n} events`);
    } catch (err) {
      logger.error('[scheduler] cart.abandonedScan failed', err);
    }
  });
}
