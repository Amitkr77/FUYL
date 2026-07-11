import { SubscriptionRepository } from '../repositories/subscription.repository';
import { logger } from '../../../config/logger';

const subRepo = new SubscriptionRepository();

/**
 * Billing monitor — runs daily via cron.
 *
 * This used to be the trigger that created subscription orders: it found
 * "due" subscriptions and optimistically spawned an order for each one
 * before any payment had actually been confirmed (see git history). That
 * was wrong for two reasons:
 *
 *  1. Razorpay Subscriptions (UPI Autopay/e-mandate) charges the customer
 *     on its own schedule and tells us the outcome via webhook
 *     (subscription.charged / payment_failed / halted) — our own cron
 *     guessing "it's due, so it must have been charged" has no real
 *     signal behind it.
 *  2. It used a hardcoded placeholder shipping address for every order
 *     ("Subscriber", Bangalore 560001) regardless of who the customer was.
 *
 * Order creation now happens in razorpayWebhookService.onCharged(), which
 * only runs once Razorpay confirms a real payment, and resolves the
 * customer's actual saved address. This service's remaining job is a
 * read-only safety net: flag ACTIVE subscriptions whose nextDeliveryDate
 * passed without any webhook moving them since, which likely means a
 * webhook delivery was missed. It never mutates subscription/order state
 * or fabricates a charge outcome — only a human (or a Razorpay-side
 * reconciliation report) can determine what actually happened to a
 * payment we never heard back about.
 */
export class BillingService {
  async runDaily(graceHours = 24): Promise<{ overdue: number }> {
    const overdue = await subRepo.findOverdueActive(graceHours);
    if (overdue.length > 0) {
      logger.warn(
        `[billing] ${overdue.length} subscription(s) are ACTIVE with nextDeliveryDate more than ${graceHours}h in the past ` +
        `and no webhook has updated them since — possible missed Razorpay webhook delivery. Needs manual review.`,
        { subscriptionIds: overdue.map((s) => s.id) }
      );
    } else {
      logger.info('[billing] no overdue subscriptions found');
    }
    return { overdue: overdue.length };
  }
}

export const billingService = new BillingService();
