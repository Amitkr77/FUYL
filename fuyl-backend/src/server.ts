import http from 'http';
import { env } from './config/env';
import { logger } from './config/logger';
import { connectDB, disconnectDB } from './config/db';
import { cacheService } from './shared/services/cache.service';
import { eventBus } from './shared/services/eventBus.service';
import { startAll, stopAll } from './config/scheduler';
import { registerSubscriptionSchedulers } from './modules/subscription';
import { registerReferralSchedulers, registerReferralEventSubscribers } from './modules/referral';
import { registerIdentitySchedulers } from './modules/identity';
import { registerWalletEventSubscribers } from './modules/wallet';
import {
  registerNotificationEventSubscribers,
  startNotificationWorker,
  stopNotificationWorker,
  notificationService,
} from './modules/notification';
import { registerCartSchedulers } from './modules/cart';
import { registerInventorySchedulers } from './modules/inventory';
import {
  registerAnalyticsEventSubscribers,
  registerAnalyticsSchedulers,
  startAnalyticsWorker,
  stopAnalyticsWorker,
} from './modules/analytics';
import { createApp } from './app';

async function bootstrap() {
  logger.info(`[boot] starting ${env.appName} in ${env.nodeEnv} mode`);

  // 1. Connect MongoDB
  await connectDB();

  // 2. Connect Redis / cache
  //    (connection is established lazily on first use; warm it up here)
  await cacheService.getClient().ping().catch((err) => {
    logger.warn('[boot] Redis not reachable — queue/event features may degrade', err);
  });

  // 3. Start Redis event bus subscriber
  eventBus.startRedisSubscriber();

  // 4. Register event subscribers
  //    - referral listens to user/order events
  //    - wallet listens to referral/subscription/order events
  //    - notification listens to ALL events and dispatches appropriate messages
  //    - analytics listens to ALL events and tracks them
  registerReferralEventSubscribers();
  registerWalletEventSubscribers();
  registerNotificationEventSubscribers();
  registerAnalyticsEventSubscribers();

  // 5. Seed notification templates (idempotent)
  await notificationService.seedBuiltinTemplates().catch((err) => {
    logger.warn('[boot] failed to seed notification templates', err);
  });

  // 6. Start the queue workers (notification dispatch + analytics tracking)
  startNotificationWorker();
  startAnalyticsWorker();

  // 7. Register schedulers
  registerIdentitySchedulers();
  registerSubscriptionSchedulers();
  registerReferralSchedulers();
  registerCartSchedulers();
  registerInventorySchedulers();
  registerAnalyticsSchedulers();
  startAll();

  // 8. Create HTTP server
  const app = createApp();
  const server = http.createServer(app);

  server.listen(env.port, () => {
    logger.info(`[boot] HTTP server listening on http://localhost:${env.port}`);
    logger.info(`[boot] API base:        /${env.apiPrefix}`);
    logger.info(`[boot] Swagger docs:    /docs`);
    logger.info(`[boot] Razorpay webhook: /${env.apiPrefix}/webhooks/razorpay/subscription`);
  });

  // 9. Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`[shutdown] received ${signal}`);
    server.close();
    stopAll();
    await stopNotificationWorker();
    await stopAnalyticsWorker();
    await cacheService.disconnect();
    await disconnectDB();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('[unhandledRejection]', reason);
  });
  process.on('uncaughtException', (err) => {
    logger.error('[uncaughtException]', err);
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.error('[boot] failed', err);
  process.exit(1);
});
