import { schedule } from '../../../config/scheduler';
import { rollupMetrics } from './analytics.service';
import { logger } from '../../../config/logger';

export function registerAnalyticsSchedulers(): void {
  // Hourly rollup
  schedule('analytics.rollup.hourly', '0 * * * *', async () => {
    logger.debug('[scheduler] analytics.rollup.hourly tick');
    try {
      await rollupMetrics('hour');
    } catch (err) {
      logger.error('[scheduler] analytics.rollup.hourly failed', err);
    }
  });

  // Daily rollup at 2am
  schedule('analytics.rollup.daily', '0 2 * * *', async () => {
    logger.debug('[scheduler] analytics.rollup.daily tick');
    try {
      await rollupMetrics('day');
    } catch (err) {
      logger.error('[scheduler] analytics.rollup.daily failed', err);
    }
  });

  // Monthly rollup on 1st of each month at 3am
  schedule('analytics.rollup.monthly', '0 3 1 * *', async () => {
    logger.debug('[scheduler] analytics.rollup.monthly tick');
    try {
      await rollupMetrics('month');
    } catch (err) {
      logger.error('[scheduler] analytics.rollup.monthly failed', err);
    }
  });
}
