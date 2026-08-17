import { schedule, Schedules } from '../../../config/scheduler';
import { logger } from '../../../config/logger';
import { loyaltyExpiryService } from './expiry.service';

export function registerLoyaltySchedulers(): void {
  schedule('loyalty.expiry', Schedules.LOYALTY_EXPIRY, async () => {
    let users = 0;
    let points = 0;
    // Drain bounded batches so a backlog does not take one day per 500 users,
    // while retaining a hard ceiling for predictable scheduler runtime.
    for (let batch = 0; batch < 20; batch += 1) {
      const result = await loyaltyExpiryService.sweep();
      users += result.users;
      points += result.points;
      if (result.users < 500) break;
    }
    logger.info('[loyalty.expiry] sweep completed', { users, points });
  });
}
