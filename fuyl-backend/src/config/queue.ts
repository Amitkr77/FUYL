import { Queue, QueueEvents } from 'bullmq';
import IORedis from 'ioredis';
import { redisConfig } from './redis';
import { logger } from './logger';

// BullMQ ships its own bundled ioredis version. The two `ioredis` types are
// structurally identical but TypeScript sees them as different — cast through
// unknown to bridge the gap. The runtime value is a normal IORedis instance.
export const redisConnection = new IORedis(redisConfig) as unknown as any;

export const QUEUE_NAMES = {
  SUBSCRIPTION_BILLING: 'subscription-billing',
  SUBSCRIPTION_DUNNING: 'subscription-dunning',
  SUBSCRIPTION_REMINDERS: 'subscription-reminders',
  REFERRAL_FRAUD_SCAN: 'referral-fraud-scan',
  REFERRAL_REWARD: 'referral-reward',
  CART_ABANDONED: 'cart-abandoned',
  NOTIFICATION_DISPATCH: 'notification-dispatch',
  ANALYTICS_EVENT: 'analytics-event',
  IMAGE_UPLOAD: 'image-upload',
  INVOICE_GENERATE: 'invoice-generate',
} as const;

export type QueueName = keyof typeof QUEUE_NAMES;

const queueRegistry = new Map<string, Queue>();
const eventsRegistry = new Map<string, QueueEvents>();

export function getQueue(name: string): Queue {
  let q = queueRegistry.get(name);
  if (!q) {
    q = new Queue(name, { connection: redisConnection });
    queueRegistry.set(name, q);
  }
  return q;
}

export function getQueueEvents(name: string): QueueEvents {
  let e = eventsRegistry.get(name);
  if (!e) {
    e = new QueueEvents(name, { connection: redisConnection });
    eventsRegistry.set(name, e);
  }
  return e;
}

export async function addJob<T = unknown>(
  queueName: string,
  jobName: string,
  data: T,
  opts?: { delay?: number; attempts?: number; jobId?: string }
): Promise<void> {
  const q = getQueue(queueName);
  await q.add(jobName, data, {
    attempts: opts?.attempts ?? 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail: 500,
    delay: opts?.delay,
    jobId: opts?.jobId,
  });
  logger.debug(`[queue] job enqueued: ${queueName}/${jobName}`);
}

export async function closeQueues(): Promise<void> {
  await Promise.allSettled([
    ...Array.from(queueRegistry.values()).map((q) => q.close()),
    ...Array.from(eventsRegistry.values()).map((e) => e.close()),
    redisConnection.quit(),
  ]);
  logger.info('[queue] all queues closed');
}
