import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
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
router.get('/admin/shipping', authRequired, shippingController.listAllForAdmin);
router.get('/admin/shipping/stats', authRequired, shippingController.stats);
router.post('/admin/shipping/:id/sync', authRequired, shippingController.syncTracking);
router.post('/admin/shipping/:id/reattempt', authRequired, shippingController.reattempt);
router.get('/admin/shipping/:id/label', authRequired, shippingController.label);

export default router;
