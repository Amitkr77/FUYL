import { Worker, Job } from 'bullmq';
import { QUEUE_NAMES, redisConnection } from '../../../config/queue';
import { AnalyticsEventModel, AnalyticsMetricModel } from '../models/event.model';
import { logger } from '../../../config/logger';
import { Types } from 'mongoose';

/**
 * Track an analytics event. Called via queueService.analyticsEvent().
 */
export async function trackEvent(data: {
  event: string;
  userId?: string;
  sessionId?: string;
  properties?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
  page?: string;
  referrer?: string;
  utm?: { source?: string; medium?: string; campaign?: string; term?: string; content?: string };
  value?: number;
  currency?: string;
  occurredAt?: Date;
}): Promise<void> {
  await AnalyticsEventModel.create({
    event: data.event,
    userId: data.userId ? new Types.ObjectId(data.userId) : undefined,
    sessionId: data.sessionId,
    properties: data.properties ?? {},
    ip: data.ip,
    userAgent: data.userAgent,
    page: data.page,
    referrer: data.referrer,
    utm: data.utm,
    value: data.value,
    currency: data.currency ?? 'INR',
    occurredAt: data.occurredAt ?? new Date(),
  });
}

/**
 * Aggregate events into daily/hourly metric buckets.
 * For simplicity, this is a flat count + sum(value) per metric.
 */
export async function rollupMetrics(bucket: 'hour' | 'day' | 'month' = 'day'): Promise<number> {
  const now = new Date();
  let bucketStart: Date;
  let bucketEnd: Date;

  if (bucket === 'hour') {
    bucketStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() - 1);
    bucketEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  } else if (bucket === 'month') {
    bucketStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    bucketEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    bucketStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    bucketEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  const aggregation = await AnalyticsEventModel.aggregate([
    { $match: { occurredAt: { $gte: bucketStart, $lt: bucketEnd } } },
    {
      $group: {
        _id: '$event',
        count: { $sum: 1 },
        value: { $sum: { $ifNull: ['$value', 0] } },
      },
    },
  ]);

  let n = 0;
  for (const a of aggregation) {
    await AnalyticsMetricModel.updateOne(
      { metric: a._id, bucket, bucketStart },
      {
        $set: { value: a.value, count: a.count },
        $setOnInsert: { bucketStart },
      },
      { upsert: true }
    );
    n++;
  }
  logger.info(`[analytics] rolled up ${n} metrics for bucket ${bucket} (${bucketStart.toISOString()})`);
  return n;
}

let worker: Worker | null = null;

export function startAnalyticsWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(
    QUEUE_NAMES.ANALYTICS_EVENT,
    async (job: Job) => {
      await trackEvent(job.data as any);
    },
    {
      connection: redisConnection,
      concurrency: 10,
    }
  );

  worker.on('failed', (job, err) => {
    logger.error(`[analytics-worker] job ${job?.id} failed: ${err.message}`);
  });

  logger.info('[analytics-worker] started');
  return worker;
}

export async function stopAnalyticsWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
}
