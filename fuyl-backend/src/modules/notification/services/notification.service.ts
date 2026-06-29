import { Worker, Job } from 'bullmq';
import { NotificationLogRepository } from '../repositories/notificationLog.repository';
import { TemplateRepository } from '../repositories/template.repository';
import { NotificationPreferenceRepository } from '../repositories/preference.repository';
import { renderTemplate, extractVariables } from '../utils/templateEngine';
import { sendEmail } from '../utils/emailProvider';
import { sendSms, sendWhatsapp } from '../utils/smsProvider';
import { QUEUE_NAMES, redisConnection } from '../../../config/queue';
import { logger } from '../../../config/logger';
import { Types } from 'mongoose';
import { BUILTIN_TEMPLATES } from '../utils/builtinTemplates';

const logRepo = new NotificationLogRepository();
const templateRepo = new TemplateRepository();
const prefRepo = new NotificationPreferenceRepository();

export interface NotificationDispatchPayload {
  channel: 'email' | 'sms' | 'whatsapp' | 'push';
  to: { email?: string; phone?: string; pushToken?: string; userId?: string };
  template: string;
  data?: Record<string, unknown>;
  userId?: string;
  category?: string;             // 'transactional' | 'marketing' | 'subscription' | 'referral'
  scheduledAt?: Date;
  idempotencyKey?: string;
}

class NotificationService {
  /**
   * Queue a notification to be sent asynchronously via the NOTIFICATION_DISPATCH queue.
   * This is the main entry point used across the codebase (via queueService.notificationDispatch).
   */
  async dispatch(payload: NotificationDispatchPayload): Promise<void> {
    // Pre-flight: log to DB with status='queued' so we have a record even if dispatch fails
    const userId = payload.userId ?? payload.to.userId;
    const log = await logRepo.create({
      userId: userId ? new Types.ObjectId(userId) : undefined,
      channel: payload.channel,
      template: payload.template,
      to: payload.to,
      data: payload.data,
      status: 'queued',
      scheduledAt: payload.scheduledAt ?? new Date(),
      attempts: 0,
    });

    // The actual send happens in the worker (this.dispatchSync), invoked via queue.
    // We pass the logId so the worker can update the log entry.
    const { addJob } = await import('../../../config/queue');
    await addJob(QUEUE_NAMES.NOTIFICATION_DISPATCH, 'send', {
      logId: log._id.toString(),
      payload,
    });
  }

  /**
   * Synchronously process a notification — called by the BullMQ worker.
   * Public so tests can invoke directly.
   */
  async processOne(logId: string, payload: NotificationDispatchPayload): Promise<void> {
    const log = await logRepo.findById(logId);
    if (!log) {
      logger.warn(`[notification] log ${logId} not found — skipping`);
      return;
    }
    if (log.status === 'sent') {
      logger.info(`[notification] log ${logId} already sent — skipping`);
      return;
    }

    await logRepo.incrementAttempts(logId);

    // 1. Load template
    const tpl = await templateRepo.findByName(payload.template);
    if (!tpl) {
      await logRepo.updateStatus(logId, 'failed', { error: `Template "${payload.template}" not found` });
      logger.warn(`[notification] template "${payload.template}" not found`);
      return;
    }

    // 2. Check user preferences (skip for transactional email if no userId though)
    if (payload.userId) {
      const userIdObj = new Types.ObjectId(payload.userId);
      const enabled = await prefRepo.isChannelEnabled(
        userIdObj,
        payload.channel,
        payload.category
      );
      if (!enabled && payload.category !== 'transactional') {
        await logRepo.updateStatus(logId, 'skipped', { error: 'User preference disabled' });
        logger.info(`[notification] user ${payload.userId} opted out of ${payload.channel}/${payload.category}`);
        return;
      }
    }

    // 3. Render template
    const data = payload.data ?? {};
    const subject = tpl.subject ? renderTemplate(tpl.subject, data) : undefined;
    const body = renderTemplate(tpl.body, data);

    // 4. Send via provider
    try {
      let providerMessageId: string | undefined;
      if (tpl.channel === 'email') {
        if (!payload.to.email) {
          await logRepo.updateStatus(logId, 'failed', { error: 'Email address required' });
          return;
        }
        const r = await sendEmail({ to: payload.to.email, subject: subject ?? '', html: body, text: body });
        providerMessageId = r.providerMessageId;
      } else if (tpl.channel === 'sms') {
        if (!payload.to.phone) {
          await logRepo.updateStatus(logId, 'failed', { error: 'Phone number required' });
          return;
        }
        const r = await sendSms({ to: payload.to.phone, body });
        providerMessageId = r.providerMessageId;
      } else if (tpl.channel === 'whatsapp') {
        if (!payload.to.phone) {
          await logRepo.updateStatus(logId, 'failed', { error: 'Phone number required' });
          return;
        }
        const r = await sendWhatsapp({ to: payload.to.phone, body });
        providerMessageId = r.providerMessageId;
      } else {
        // push — not implemented yet
        await logRepo.updateStatus(logId, 'skipped', { error: 'Push channel not implemented' });
        return;
      }

      await logRepo.updateStatus(logId, 'sent', {
        providerMessageId,
        sentAt: new Date(),
      });
      logger.info(`[notification] sent ${tpl.channel} "${tpl.name}" to ${payload.to.email ?? payload.to.phone}`);
    } catch (err: any) {
      await logRepo.updateStatus(logId, 'failed', { error: err?.message ?? String(err) });
      logger.error(`[notification] send failed for ${tpl.channel} "${tpl.name}"`, err);
      throw err; // let BullMQ retry
    }
  }

  /**
   * Retry failed notifications (called by scheduler).
   */
  async retryFailed(): Promise<number> {
    const failed = await logRepo.findFailed(100);
    let count = 0;
    for (const log of failed) {
      try {
        const payload: NotificationDispatchPayload = {
          channel: log.channel as any,
          to: { email: log.to.email, phone: log.to.phone, pushToken: log.to.pushToken },
          template: log.template,
          data: log.data as Record<string, unknown> | undefined,
          userId: log.userId?.toString(),
        };
        await this.processOne(log._id.toString(), payload);
        count++;
      } catch (err) {
        logger.error(`[notification] retry failed for ${log._id}`, err);
      }
    }
    return count;
  }

  /**
   * Seed built-in templates into the database. Idempotent.
   */
  async seedBuiltinTemplates(): Promise<number> {
    let n = 0;
    for (const t of BUILTIN_TEMPLATES) {
      const variables = extractVariables(t.body + ' ' + (t.subject ?? ''));
      await templateRepo.upsertByName(t.name, {
        channel: t.channel,
        subject: t.subject,
        body: t.body,
        variables,
        description: t.description,
        isActive: true,
      });
      n++;
    }
    logger.info(`[notification] seeded ${n} built-in templates`);
    return n;
  }
}

export const notificationService = new NotificationService();

// ─── BullMQ Worker ────────────────────────────────────────────────────────────
let worker: Worker | null = null;

export function startNotificationWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(
    QUEUE_NAMES.NOTIFICATION_DISPATCH,
    async (job: Job) => {
      const { logId, payload } = job.data as { logId: string; payload: NotificationDispatchPayload };
      await notificationService.processOne(logId, payload);
    },
    {
      connection: redisConnection,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    logger.debug(`[notification-worker] job ${job.id} completed`);
  });
  worker.on('failed', (job, err) => {
    logger.error(`[notification-worker] job ${job?.id} failed: ${err.message}`);
  });

  logger.info('[notification-worker] started');
  return worker;
}

export async function stopNotificationWorker(): Promise<void> {
  if (worker) {
    await worker.close();
    worker = null;
  }
}
