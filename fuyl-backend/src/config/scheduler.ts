import cron from 'node-cron';
import { logger } from './logger';

type ScheduledTask = {
  name: string;
  expression: string;
  task: cron.ScheduledTask;
};

const registry: ScheduledTask[] = [];

export function schedule(
  name: string,
  expression: string,
  handler: () => void | Promise<void>
): void {
  if (!cron.validate(expression)) {
    throw new Error(`[scheduler] invalid cron expression "${expression}" for "${name}"`);
  }
  const task = cron.schedule(expression, async () => {
    try {
      await handler();
    } catch (err) {
      logger.error(`[scheduler] task "${name}" failed:`, err);
    }
  });
  registry.push({ name, expression, task });
  logger.info(`[scheduler] registered "${name}" → ${expression}`);
}

export function startAll(): void {
  registry.forEach((t) => t.task.start());
  logger.info(`[scheduler] started ${registry.length} tasks`);
}

export function stopAll(): void {
  registry.forEach((t) => t.task.stop());
  logger.info('[scheduler] stopped all tasks');
}

export const Schedules = {
  SUBSCRIPTION_BILLING: '0 2 * * *',        // daily 02:00
  SUBSCRIPTION_DUNNING: '0 * * * *',        // hourly
  SUBSCRIPTION_REMINDERS: '0 3 * * *',      // daily 03:00
  REFERRAL_FRAUD_SCAN: '0 4 * * *',         // nightly 04:00
  REFERRAL_EXPIRY_SWEEPER: '0 5 * * *',     // daily 05:00
  CART_ABANDONED: '*/30 * * * *',           // every 30 min
  ANALYTICS_FLUSH: '*/5 * * * *',           // every 5 min
} as const;
