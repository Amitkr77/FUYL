import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { adminController } from '../controllers';
import { SiteSettingsModel } from '../models';
import { success, paginate } from '../../../shared/responses';
import { queryAuditLogs } from '../services/auditLog.service';

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

// Public payment config — no auth required (tells the storefront which methods are available)
router.get('/settings/payment', async (_req, res, next) => {
  try {
    const s = await SiteSettingsModel.findOne({});
    const payment = s?.payment ?? { onlinePaymentEnabled: true, codEnabled: true };
    return success(res, payment);
  } catch (err) { next(err); }
});

// Site settings (singleton — GET returns the current config, PUT merges a patch)
router.get('/admin/settings', async (_req, res, next) => {
  try {
    const settings = await SiteSettingsModel.findOne({}) ?? await SiteSettingsModel.create({});
    return success(res, settings);
  } catch (err) { next(err); }
});
router.put('/admin/settings/payment', async (req, res, next) => {
  try {
    const settings = await SiteSettingsModel.findOneAndUpdate(
      {},
      { $set: { payment: req.body } },
      { new: true, upsert: true, runValidators: true }
    );
    return success(res, settings);
  } catch (err) { next(err); }
});

// Audit logs
router.get('/admin/audit-logs', async (req, res, next) => {
  try {
    const section = req.query.section as string | undefined;
    const page  = parseInt(req.query.page  as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const result = await queryAuditLogs({ section, page, limit });
    return paginate(res, result.items, result.total, result.page, result.limit);
  } catch (err) { next(err); }
});

// Health
router.get('/admin/health', (_req, res) => {
  res.json({ success: true, module: 'admin', status: 'active' });
});

export default router;
