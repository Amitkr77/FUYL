import { addJob, QUEUE_NAMES } from '../../config/queue';
import { notificationService, NotificationDispatchPayload } from '../../modules/notification/services/notification.service';

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

  // BUG FIXED: this used to enqueue the raw payload directly via addJob(),
  // but the NOTIFICATION_DISPATCH worker (notification.service.ts) expects
  // job.data shaped as `{ logId, payload }` — a log row created up front so
  // the worker has something to update. Every direct call site (password
  // reset, resend-verification, referral share, ...) enqueued a payload with
  // no `logId`, so the worker's `job.data.logId` was always undefined,
  // `logRepo.findById(undefined)` never resolved a log, and the job was
  // silently skipped — these emails never sent, with no error anywhere.
  // Routing through notificationService.dispatch() (which creates the log
  // row first) makes this call site equivalent to the working event-bus path.
  notificationDispatch(data: NotificationDispatchPayload) {
    return notificationService.dispatch(data);
  }

  analyticsEvent(data: unknown) {
    return addJob(QUEUE_NAMES.ANALYTICS_EVENT, 'track', data);
  }

  invoiceGenerate(data: unknown) {
    return addJob(QUEUE_NAMES.INVOICE_GENERATE, 'generate', data);
  }
}

export const queueService = new QueueService();
