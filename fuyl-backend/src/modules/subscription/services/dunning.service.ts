import { SubscriptionRepository } from '../repositories/subscription.repository';
import { SubscriptionStatus } from '../../../shared/enums';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import { eventBus, Events } from '../../../shared/services/eventBus.service';

const subRepo = new SubscriptionRepository();

/**
 * Dunning safety net — runs hourly via cron.
 *
 * Razorpay Subscriptions (UPI Autopay/e-mandate) retries failed charges on
 * its own schedule and reports outcomes via webhook
 * (subscription.charged / subscription.payment_failed / subscription.halted
 * — see razorpayWebhook.service.ts, which is the real recovery/cancellation
 * path). There is no Razorpay API to force a retry on demand, so this
 * service previously simulated one with `Math.random() > 0.5` — a coin
 * flip deciding whether a real customer's subscription lived or died,
 * unrelated to whether they were actually charged. That has been removed.
 *
 * What's left is a genuine safety net: a subscription that's been PAST_DUE
 * for longer than the configured retry window with no webhook ever moving
 * it (e.g. a missed/failed webhook delivery) gets cancelled here rather
 * than staying stuck in limbo forever. It never fabricates a "recovered"
 * outcome — only the webhook handler does that, because only it has a real
 * signal to act on.
 */
export class DunningService {
  async runHourly(): Promise<{ processed: number; cancelled: number }> {
    const graceHours = env.subscription.dunningMaxRetries * env.subscription.dunningRetryIntervalHours;
    const stale = await subRepo.findStalePastDue(graceHours);
    logger.info(`[dunning] ${stale.length} subscription(s) past-due for over ${graceHours}h with no webhook update — cancelling`);

    let cancelled = 0;
    for (const sub of stale) {
      try {
        await subRepo.updateStatus(sub._id, SubscriptionStatus.CANCELLED, {
          cancelledAt: new Date(),
          cancelledReason: 'Payment retry window exhausted with no recovery signal from Razorpay',
        });
        cancelled++;
        eventBus.publish(Events.SUBSCRIPTION_FAILED, {
          subscriptionId: sub.id,
          customerId: sub.customerId.toString(),
          reason: 'Dunning window exhausted',
          final: true,
        });
      } catch (err) {
        logger.error(`[dunning] failed to cancel stale subscription ${sub.id}`, err);
      }
    }

    return { processed: stale.length, cancelled };
  }
}

export const dunningService = new DunningService();
