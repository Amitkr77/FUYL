import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { adminController } from '../controllers';

const router = Router();

// All admin routes require admin/super_admin.
// IMPORTANT: this must be scoped to '/admin' specifically. router.use(mw)
// with no path applies to every request that reaches this router's
// dispatch — and since adminRouter itself is mounted with no prefix
// (matches everything), an unscoped call here rejected every request that
// didn't match one of the ~15 routers mounted before it, before it ever
// reached any router mounted after it (subscription, referral, upload,
// content, marketing — including the Razorpay webhook routes, which can
// never carry a Bearer token). Confirmed live: /posts, /uploads/health,
// /marketing/health all 401'd with "Missing Authorization header" until
// this was scoped.
router.use('/admin', authRequired, authorize(Roles.ADMIN, Roles.SUPER_ADMIN));

router.get('/admin/overview', adminController.overview);
router.get('/admin/customers', adminController.listCustomers);
router.get('/admin/customers/:id', adminController.getCustomer);
router.get('/admin/recent-activity', adminController.recentActivity);
router.get('/admin/system-health', adminController.systemHealth);

// Health
router.get('/admin/health', (_req, res) => {
  res.json({ success: true, module: 'admin', status: 'active' });
});

export default router;
