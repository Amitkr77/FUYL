import { addJob, QUEUE_NAMES } from '../../config/queue';

/**
 * Thin wrapper around the queue system for ergonomic, type-safe job dispatch.
 */
class QueueService {
  subscriptionBilling(data: unknown, delayMs?: number) {
    return addJob(QUEUE_NAMES.SUBSCRIPTION_BILLING, 'process', data, { delay: delayMs });
  }

  subscriptionDunning(data: unknown) {
    return addJob(QUEUE_NAMES.SUBSCRIPTION_DUNNING, 'retry', data, { attempts: 1 });
  }

  subscriptionReminder(data: unknown) {
    return addJob(QUEUE_NAMES.SUBSCRIPTION_REMINDERS, 'send', data);
  }

  referralFraudScan() {
    return addJob(QUEUE_NAMES.REFERRAL_FRAUD_SCAN, 'scan', {});
  }

  referralReward(data: unknown) {
    return addJob(QUEUE_NAMES.REFERRAL_REWARD, 'process', data, { jobId: (data as { referralId?: string }).referralId });
  }

  cartAbandoned(data: unknown) {
    return addJob(QUEUE_NAMES.CART_ABANDONED, 'remind', data);
  }

  notificationDispatch(data: unknown) {
    return addJob(QUEUE_NAMES.NOTIFICATION_DISPATCH, 'send', data);
  }

  analyticsEvent(data: unknown) {
    return addJob(QUEUE_NAMES.ANALYTICS_EVENT, 'track', data);
  }

  invoiceGenerate(data: unknown) {
    return addJob(QUEUE_NAMES.INVOICE_GENERATE, 'generate', data);
  }
}

export const queueService = new QueueService();
