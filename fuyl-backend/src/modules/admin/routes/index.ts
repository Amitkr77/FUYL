import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { authorize, requirePermission, Permissions, Roles } from '../../../shared/middleware/rbac.middleware';
import { adminController } from '../controllers';
import { SiteSettingsModel } from '../models';
import { success, paginate } from '../../../shared/responses';
import { queryAuditLogs } from '../services/auditLog.service';

const router = Router();

// Per-route guards — previously a blanket router.use('/admin', authorize(admin,super_admin))
// was used here which blocked all staff. Routes now use the narrowest guard
// that fits: requirePermission() already passes admin/super_admin through
// automatically and checks the permission only for staff.
const adminOnly = [authRequired, authorize(Roles.ADMIN, Roles.SUPER_ADMIN)];
const anyStaff  = [authRequired, authorize(Roles.ADMIN, Roles.SUPER_ADMIN, Roles.STAFF)];

router.get('/admin/overview',         ...anyStaff,  adminController.overview);
router.get('/admin/recent-activity',  ...anyStaff,  adminController.recentActivity);
router.get('/admin/customers',        authRequired, requirePermission(Permissions.CUSTOMERS_MANAGE), adminController.listCustomers);
router.get('/admin/customers/:id',    authRequired, requirePermission(Permissions.CUSTOMERS_MANAGE), adminController.getCustomer);
router.get('/admin/system-health',    ...adminOnly, adminController.systemHealth);

// Public payment config — no auth required (tells the storefront which methods are available)
router.get('/settings/payment', async (_req, res, next) => {
  try {
    const s = await SiteSettingsModel.findOne({});
    const payment = s?.payment ?? { onlinePaymentEnabled: true, codEnabled: true };
    return success(res, payment);
  } catch (err) { next(err); }
});

// Site settings (singleton — GET returns the current config, PUT merges a patch)
router.get('/admin/settings', ...adminOnly, async (_req, res, next) => {
  try {
    const settings = await SiteSettingsModel.findOne({}) ?? await SiteSettingsModel.create({});
    return success(res, settings);
  } catch (err) { next(err); }
});
router.put('/admin/settings/payment', ...adminOnly, async (req, res, next) => {
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
router.get('/admin/audit-logs', ...adminOnly, async (req, res, next) => {
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
