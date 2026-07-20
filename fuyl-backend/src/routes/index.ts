import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env';
import { cacheService } from '../shared/services/cache.service';

// Existing modules (stubs)
import { identityRouter } from '../modules/identity';
import { customerRouter } from '../modules/customer';
import { catalogRouter } from '../modules/catalog';
import { inventoryRouter } from '../modules/inventory';
import { pricingRouter } from '../modules/pricing';
import { promotionRouter } from '../modules/promotion';
import { cartRouter } from '../modules/cart';
import { checkoutRouter } from '../modules/checkout';
import { orderRouter } from '../modules/order';
import { paymentRouter } from '../modules/payment';
import { walletRouter } from '../modules/wallet';
import { reviewRouter } from '../modules/review';
import { notificationRouter } from '../modules/notification';
import { analyticsRouter } from '../modules/analytics';
import { adminRouter } from '../modules/admin';

// NEW modules — fully implemented
import { subscriptionRouter } from '../modules/subscription';
import { referralRouter } from '../modules/referral';
import { uploadRouter } from '../modules/upload';
import { contentRouter } from '../modules/content';
import { marketingRouter } from '../modules/marketing';
import { shippingRouter } from '../modules/shipping';

const router = Router();

// Liveness — is the process up? (cheap, no dependencies)
router.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, service: env.appName, env: env.nodeEnv, time: new Date().toISOString() });
});

// Readiness — can we actually serve traffic? Checks MongoDB + Redis so an
// orchestrator reroutes/restarts a pod whose dependencies are down instead of
// sending it live traffic. Redis ping is bounded (the shared client retries
// forever, so an unbounded ping would hang this probe when Redis is down).
router.get('/health/ready', async (_req: Request, res: Response) => {
  const mongoUp = mongoose.connection.readyState === 1;
  const redisUp = await Promise.race([
    cacheService.getClient().ping().then((r) => r === 'PONG').catch(() => false),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1000)),
  ]);
  const ok = mongoUp && redisUp;
  res.status(ok ? 200 : 503).json({
    success: ok,
    checks: { mongo: mongoUp, redis: redisUp },
    time: new Date().toISOString(),
  });
});

// Existing modules
router.use(identityRouter);
router.use(customerRouter);
router.use(catalogRouter);
router.use(inventoryRouter);
router.use(pricingRouter);
router.use(promotionRouter);
router.use(cartRouter);
router.use(checkoutRouter);
router.use(orderRouter);
router.use(paymentRouter);
router.use(walletRouter);
router.use(reviewRouter);
router.use(notificationRouter);
router.use(analyticsRouter);
router.use(adminRouter);

// NEW modules
router.use(subscriptionRouter);
router.use(referralRouter);
router.use(uploadRouter);
router.use(contentRouter);
router.use(marketingRouter);
router.use(shippingRouter);

export default router;
