import { schedule, Schedules } from '../../../config/scheduler';
import { billingService } from './billing.service';
import { dunningService } from './dunning.service';
import { DeliveryRepository } from '../repositories/delivery.repository';
import { queueService } from '../../../shared/services/queue.service';
import { logger } from '../../../config/logger';
import { env } from '../../../config/env';

const deliveryRepo = new DeliveryRepository();

/**
 * Registers all subscription-related cron jobs.
 * Called once from src/server.ts at boot.
 */
export function registerSubscriptionSchedulers(): void {
  schedule('subscription.billing', Schedules.SUBSCRIPTION_BILLING, async () => {
    logger.info('[scheduler] subscription.billing tick');
    const res = await billingService.runDaily();
    logger.info(`[scheduler] subscription.billing result`, res);
  });

  schedule('subscription.dunning', Schedules.SUBSCRIPTION_DUNNING, async () => {
    logger.info('[scheduler] subscription.dunning tick');
    const res = await dunningService.runHourly();
    logger.info(`[scheduler] subscription.dunning result`, res);
  });

  schedule('subscription.reminders', Schedules.SUBSCRIPTION_REMINDERS, async () => {
    logger.info('[scheduler] subscription.reminders tick');
    const upcoming = await deliveryRepo.findDueReminders(env.subscription.reminderDays);
    for (const d of upcoming) {
      queueService.subscriptionReminder({
        subscriptionId: d.subscriptionId.toString(),
        customerId: d.customerId.toString(),
        scheduledFor: d.scheduledFor,
        cycleNumber: d.cycleNumber,
        amount: d.amount,
      });
    }
    logger.info(`[scheduler] subscription.reminders dispatched ${upcoming.length}`);
  });
}
