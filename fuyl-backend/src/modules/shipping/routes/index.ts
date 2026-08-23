import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { requirePermission, Permissions } from '../../../shared/middleware/rbac.middleware';
import { shippingController } from '../controllers';

const router = Router();

// Health — registered before any '/shipping/:id'-shaped route so it can
// never be shadowed (see review module's routes/index.ts for the bug this
// avoids).
router.get('/shipping/health', (_req, res) => {
  res.json({ success: true, module: 'shipping', status: 'active' });
});

// Public — pincode serviceability + shipping-rate quote for checkout.
// Registered before the '/shipping/shipments/:id' routes so the literal
// segments are matched first.
router.get('/shipping/serviceability/:pincode', shippingController.serviceability);
router.get('/shipping/rate', shippingController.rate);

// Public — Shiprocket calls this directly (no user session); authenticity is
// verified via the shared secret header inside the controller, not a route
// middleware. Doesn't need the raw-body treatment app.ts gives Cashfree's
// webhooks — Shiprocket's verification is a static secret match, not an
// HMAC over the raw request bytes, so regular express.json() parsing is fine.
router.post('/webhooks/shiprocket/tracking', shippingController.shiprocketWebhook);

// Seller/admin: book + manage shipments
router.post('/shipping/shipments', authRequired, shippingController.create);
router.get('/shipping/shipments/mine', authRequired, shippingController.listMine);
router.get('/shipping/shipments/:id', authRequired, shippingController.getById);
router.patch('/shipping/shipments/:id/status', authRequired, shippingController.updateStatus);

// Order-scoped lookup (customer can view their own order's shipments; the
// controller itself does no extra ownership check here since it only
// exposes tracking info, not sensitive data — matches getOrder's own
// authRequired-only public-within-account posture).
router.get('/shipping/orders/:orderId/shipments', authRequired, shippingController.listByOrder);

// Admin
router.get('/admin/shipping', authRequired, requirePermission(Permissions.SHIPPING_MANAGE), shippingController.listAllForAdmin);
router.get('/admin/shipping/stats', authRequired, requirePermission(Permissions.SHIPPING_MANAGE), shippingController.stats);
router.post('/admin/shipping/:id/sync', authRequired, requirePermission(Permissions.SHIPPING_MANAGE), shippingController.syncTracking);
router.post('/admin/shipping/:id/reattempt', authRequired, requirePermission(Permissions.SHIPPING_MANAGE), shippingController.reattempt);
router.get('/admin/shipping/:id/label', authRequired, requirePermission(Permissions.SHIPPING_MANAGE), shippingController.label);

export default router;
