import { SubscriptionRepository } from '../repositories/subscription.repository';
import { SubscriptionStatus } from '../../../shared/enums';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import { eventBus, Events } from '../../../shared/services/eventBus.service';

const subRepo = new SubscriptionRepository();

/**
 * Dunning service — retries failed subscription payments.
 * Runs hourly via cron.
 */
export class DunningService {
  async runHourly(): Promise<{ processed: number; recovered: number; cancelled: number }> {
    const failing = await subRepo.findFailedForDunning();
    logger.info(`[dunning] retrying ${failing.length} past-due subscriptions`);

    let recovered = 0;
    let cancelled = 0;

    for (const sub of failing) {
      try {
        const retryOk = await this.retryCharge(sub);
        if (retryOk) {
          await subRepo.resetFailures(sub._id);
          await subRepo.updateStatus(sub._id, SubscriptionStatus.ACTIVE);
          recovered++;
          eventBus.publish(Events.SUBSCRIPTION_CHARGED, {
            subscriptionId: sub.id,
            customerId: sub.customerId.toString(),
            amount: sub.finalPrice,
            cycleNumber: sub.totalCyclesExecuted + 1,
            recovered: true,
          });
        } else if (sub.consecutiveFailures + 1 >= env.subscription.dunningMaxRetries) {
          await subRepo.updateStatus(sub._id, SubscriptionStatus.CANCELLED, {
            cancelledAt: new Date(),
            cancelledReason: 'Dunning exhausted',
          });
          cancelled++;
          eventBus.publish(Events.SUBSCRIPTION_FAILED, {
            subscriptionId: sub.id,
            customerId: sub.customerId.toString(),
            reason: 'Dunning exhausted',
            final: true,
          });
        }
      } catch (err) {
        logger.error(`[dunning] retry failed for ${sub.id}`, err);
      }
    }

    return { processed: failing.length, recovered, cancelled };
  }

  private async retryCharge(sub: any): Promise<boolean> {
    // In production: call Razorpay to retry the subscription charge.
    // For scaffold we simulate ~50% recovery.
    return Math.random() > 0.5;
  }
}

export const dunningService = new DunningService();
