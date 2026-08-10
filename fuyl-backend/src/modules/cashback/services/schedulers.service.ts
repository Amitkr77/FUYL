import { schedule } from '../../../config/scheduler';
import { cashbackService } from './cashback.service';
import { logger } from '../../../config/logger';

/**
 * Registers a recurring job to process cashback earnings whose
 * scheduledCreditAt has passed (for 'after_days' timing).
 * Runs every hour.
 */
export function registerCashbackSchedulers(): void {
  schedule('cashback.processDue', '0 * * * *', async () => {
    try {
      await cashbackService.processDueEarnings();
    } catch (err) {
      logger.error('[cashback.scheduler] processDueEarnings failed', err);
    }
  });

  logger.info('[cashback.scheduler] cashback schedulers registered');
}
