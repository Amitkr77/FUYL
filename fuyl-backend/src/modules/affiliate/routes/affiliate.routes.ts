import { Router } from 'express';
import { affiliateController } from '../controllers/affiliate.controller';
import { affiliateAdminController } from '../controllers/admin.controller';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { authorize } from '../../../shared/middleware/rbac.middleware';

const router = Router();

const adminOnly = authorize('admin', 'super_admin');

// ─── Public tracking redirect ─────────────────────────────────────────────────
// Storefront hits /r/:code on every affiliate link click
router.get('/r/:code', affiliateController.track.bind(affiliateController));

// ─── Public ───────────────────────────────────────────────────────────────────
router.post('/affiliate/apply', affiliateController.apply.bind(affiliateController));

// ─── Affiliate portal (requires account) ──────────────────────────────────────
router.get('/affiliate/me',             authRequired, affiliateController.me.bind(affiliateController));
router.get('/affiliate/dashboard',      authRequired, affiliateController.dashboard.bind(affiliateController));
router.get('/affiliate/links',          authRequired, affiliateController.links.bind(affiliateController));
router.post('/affiliate/links',         authRequired, affiliateController.createLink.bind(affiliateController));
router.get('/affiliate/commissions',    authRequired, affiliateController.commissions.bind(affiliateController));
router.patch('/affiliate/payment-info', authRequired, affiliateController.updatePaymentInfo.bind(affiliateController));

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get('/admin/affiliates',               authRequired, adminOnly, affiliateAdminController.list.bind(affiliateAdminController));
router.get('/admin/affiliates/stats',         authRequired, adminOnly, affiliateAdminController.stats.bind(affiliateAdminController));
router.post('/admin/affiliates/:id/approve',  authRequired, adminOnly, affiliateAdminController.approve.bind(affiliateAdminController));
router.post('/admin/affiliates/:id/reject',   authRequired, adminOnly, affiliateAdminController.reject.bind(affiliateAdminController));
router.post('/admin/affiliates/:id/suspend',  authRequired, adminOnly, affiliateAdminController.suspend.bind(affiliateAdminController));
router.post('/admin/affiliates/:id/payout',   authRequired, adminOnly, affiliateAdminController.payout.bind(affiliateAdminController));
router.get('/admin/commissions',              authRequired, adminOnly, affiliateAdminController.listCommissions.bind(affiliateAdminController));
router.post('/admin/commissions/:id/approve', authRequired, adminOnly, affiliateAdminController.approveCommission.bind(affiliateAdminController));

export { router as affiliateRouter };
