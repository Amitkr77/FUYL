import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { orderController } from '../controllers';

const router = Router();

// ─── Customer ────────────────────────────────────────────────────
router.post('/orders', authRequired, orderController.create);
router.get('/orders/me', authRequired, orderController.listMine);
router.get('/orders/:id', authRequired, orderController.getById);
router.get('/orders/number/:orderNumber', authRequired, orderController.getByOrderNumber);
router.post('/orders/:id/cancel', authRequired, orderController.cancel);
router.get('/subscriptions/:subscriptionId/orders', authRequired, orderController.listBySubscription);

// Returns
router.post('/orders/returns', authRequired, orderController.createReturn);
router.get('/orders/returns/me', authRequired, orderController.listMyReturns);

// Invoices
router.get('/orders/:id/invoices', authRequired, orderController.listInvoicesByOrder);
router.get('/invoices/:id', authRequired, orderController.getInvoice);

// ─── Admin ───────────────────────────────────────────────────────
router.get('/admin/orders', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SELLER), orderController.listAll);
router.patch('/admin/orders/:id/status', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SELLER), orderController.updateStatus);
router.get('/admin/orders/stats', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), orderController.stats);
router.post('/admin/orders/:id/invoices', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), orderController.generateInvoice);

router.get('/admin/orders/returns', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), orderController.listAllReturns);
router.patch('/admin/orders/returns/:id', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), orderController.updateReturn);

// Health
router.get('/order/health', (_req, res) => {
  res.json({ success: true, module: 'order', status: 'active' });
});

export default router;
