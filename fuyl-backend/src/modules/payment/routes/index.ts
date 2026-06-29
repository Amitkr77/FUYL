import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { paymentController } from '../controllers';

const router = Router();

// Customer
router.post('/payments', authRequired, paymentController.createPayment);
router.post('/payments/verify', authRequired, paymentController.verifyPayment);
router.get('/payments/me', authRequired, paymentController.listMine);
router.get('/orders/:orderId/payments', authRequired, paymentController.listByOrder);

// Admin
router.get('/admin/payments', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), paymentController.listAll);
router.post('/admin/payments/refund', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), paymentController.refund);
router.get('/admin/payments/stats', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), paymentController.stats);

// Health
router.get('/payment/health', (_req, res) => {
  res.json({ success: true, module: 'payment', status: 'active' });
});

export default router;
