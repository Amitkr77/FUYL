import { Router, Request, Response } from 'express';
import { env } from '../config/env';

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

// Health check
router.get('/health', (_req: Request, res: Response) => {
  res.json({ success: true, service: env.appName, env: env.nodeEnv, time: new Date().toISOString() });
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
