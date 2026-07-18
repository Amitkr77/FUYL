import { Worker, Job } from 'bullmq';
import { NotificationLogRepository } from '../repositories/notificationLog.repository';
import { TemplateRepository } from '../repositories/template.repository';
import { NotificationPreferenceRepository } from '../repositories/preference.repository';
import { renderTemplate, extractVariables } from '../utils/templateEngine';
import { sendEmail, htmlToText } from '../utils/emailProvider';
import { sendSms, sendWhatsapp } from '../utils/smsProvider';
import { sendPush } from '../utils/pushProvider';
import { QUEUE_NAMES, redisConnection } from '../../../config/queue';
import { logger } from '../../../config/logger';
import { env } from '../../../config/env';
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

    // 2b. Resolve email/phone/push tokens from userId when the caller only
    // gave us a userId. BUG FIXED (found in the fixing/testing pass): every
    // event subscriber except USER_REGISTERED (which happens to carry the
    // email in its own event payload) calls dispatch() with
    // `to: { userId }` and nothing else. With no resolution step, every
    // other notification type (order placed, subscription
    // activated/charged/failed, referral rewards, etc.) hit the channel
    // switch below with to.email/to.phone undefined and failed immediately
    // with "Email/Phone required" — meaning virtually no transactional
    // notification in the app could ever actually be delivered. Confirmed
    // by inspection: `to.email` is only ever set at the one call site that
    // happens to already have it; every other dispatch() call passes only
    // `userId`.
    if (payload.userId && (!payload.to.email || !payload.to.phone)) {
      const { UserModel } = await import('../../identity/models/user.model');
      const user = await UserModel.findById(payload.userId, { email: 1, phone: 1 }).lean();
      if (user) {
        payload.to.email = payload.to.email ?? user.email;
        payload.to.phone = payload.to.phone ?? user.phone;
      }
    }

    // 3. Render template
    // logoUrl/year/shopUrl/accountUrl are shared across every branded email
    // template (see emailLayout.ts's header/footer) — injected here once
    // rather than at every dispatch call site. Harmless no-ops for SMS/
    // WhatsApp templates, which don't reference them.
    const data: Record<string, unknown> = {
      ...(payload.data ?? {}),
      year: new Date().getFullYear(),
      logoUrl: `${env.clientUrl}/logo.webp`,
      shopUrl: `${env.clientUrl}/collections/all`,
      accountUrl: `${env.clientUrl}/account`,
    };
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
        // The HTML body is authoritative; plain-text-only clients get a
        // stripped-down text version instead of raw markup (previously the
        // same HTML string was sent as both `html` and `text`).
        const r = await sendEmail({ to: payload.to.email, subject: subject ?? '', html: body, text: htmlToText(body) });
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
      } else if (tpl.channel === 'push') {
        // Device tokens live on the preference doc (a user can have several —
        // one per device/browser). payload.to.pushToken lets a caller target
        // one specific device explicitly; otherwise fan out to every
        // registered token for this user.
        let tokens: string[] = payload.to.pushToken ? [payload.to.pushToken] : [];
        if (tokens.length === 0 && payload.userId) {
          const pref = await prefRepo.findByUser(payload.userId);
          tokens = pref?.pushTokens ?? [];
        }
        if (tokens.length === 0) {
          await logRepo.updateStatus(logId, 'failed', { error: 'No push token registered for this user' });
          return;
        }
        const r = await sendPush({ tokens, title: subject ?? tpl.name, body, data: { template: tpl.name } });
        if (r.invalidTokens.length > 0 && payload.userId) {
          await Promise.all(r.invalidTokens.map((t) => prefRepo.removePushToken(payload.userId!, t)));
        }
        // Only a real (configured) delivery attempt can actually fail —
        // stub mode (no Firebase credentials) just logs, same as the
        // email/SMS/WhatsApp providers' unconfigured fallback, which is
        // treated as "sent" rather than surfaced as an error.
        if (!r.stub && r.successCount === 0) {
          await logRepo.updateStatus(logId, 'failed', { error: 'Push delivery failed for all devices' });
          return;
        }
      } else {
        await logRepo.updateStatus(logId, 'skipped', { error: `Unknown channel "${tpl.channel}"` });
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
