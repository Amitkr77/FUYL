import { schedule, Schedules } from '../../../config/scheduler';
import { shippingService } from './shipping.service';
import { logger } from '../../../config/logger';

/**
 * Registers shipping cron jobs. Called once from src/server.ts at boot.
 * The tracking poll is a no-op when Shiprocket isn't configured.
 */
export function registerShippingSchedulers(): void {
  schedule('shipping.tracking', Schedules.SHIPPING_TRACKING, async () => {
    logger.info('[scheduler] shipping.tracking tick');
    const res = await shippingService.syncActiveShipments();
    logger.info('[scheduler] shipping.tracking result', res);
  });
}
