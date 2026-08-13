import { Router } from 'express';
import { affiliateController } from '../controllers/affiliate.controller';
import { affiliateAdminController } from '../controllers/admin.controller';
import { authRequired, authOptional } from '../../../shared/middleware/auth.middleware';
import { authorize } from '../../../shared/middleware/rbac.middleware';

const router = Router();

const adminOnly = authorize('admin', 'super_admin');

// ─── Public tracking redirect ─────────────────────────────────────────────────
// Storefront hits /r/:code on every affiliate link click
router.get('/r/:code', affiliateController.track.bind(affiliateController));

// ─── Public ───────────────────────────────────────────────────────────────────
router.post('/affiliate/apply', authOptional, affiliateController.apply.bind(affiliateController));
router.post('/affiliate/impersonation/exchange', affiliateController.exchangeImpersonation.bind(affiliateController));
router.get('/affiliate/settings', affiliateController.settings.bind(affiliateController));

// ─── Affiliate portal (requires account) ──────────────────────────────────────
router.get('/affiliate/me',             authRequired, affiliateController.me.bind(affiliateController));
router.get('/affiliate/dashboard',      authRequired, affiliateController.dashboard.bind(affiliateController));
router.get('/affiliate/links',          authRequired, affiliateController.links.bind(affiliateController));
router.post('/affiliate/links',         authRequired, affiliateController.createLink.bind(affiliateController));
router.get('/affiliate/commissions',    authRequired, affiliateController.commissions.bind(affiliateController));
router.patch('/affiliate/payment-info', authRequired, affiliateController.updatePaymentInfo.bind(affiliateController));
router.get('/affiliate/payouts',        authRequired, affiliateController.payouts.bind(affiliateController));
router.get('/affiliate/program',        authRequired, affiliateController.program.bind(affiliateController));
router.get('/affiliate/performance',    authRequired, affiliateController.performance.bind(affiliateController));
router.patch('/affiliate/profile',      authRequired, affiliateController.updateProfile.bind(affiliateController));

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get('/admin/affiliates',               authRequired, adminOnly, affiliateAdminController.list.bind(affiliateAdminController));
router.get('/admin/affiliate-programs',       authRequired, adminOnly, affiliateAdminController.programs.bind(affiliateAdminController));
router.post('/admin/affiliate-programs',      authRequired, adminOnly, affiliateAdminController.createProgram.bind(affiliateAdminController));
router.get('/admin/affiliate-programs/:id',   authRequired, adminOnly, affiliateAdminController.program.bind(affiliateAdminController));
router.patch('/admin/affiliate-programs/:id', authRequired, adminOnly, affiliateAdminController.updateProgram.bind(affiliateAdminController));
router.post('/admin/affiliate-programs/:id/default', authRequired, adminOnly, affiliateAdminController.setDefaultProgram.bind(affiliateAdminController));
router.delete('/admin/affiliate-programs/:id', authRequired, adminOnly, affiliateAdminController.deleteProgram.bind(affiliateAdminController));
router.get('/admin/affiliates/stats',         authRequired, adminOnly, affiliateAdminController.stats.bind(affiliateAdminController));
router.post('/admin/affiliates/:id/impersonate', authRequired, adminOnly, affiliateAdminController.impersonate.bind(affiliateAdminController));
router.post('/admin/affiliates',              authRequired, adminOnly, affiliateAdminController.create.bind(affiliateAdminController));
router.get('/admin/affiliates/:id',           authRequired, adminOnly, affiliateAdminController.detail.bind(affiliateAdminController));
router.patch('/admin/affiliates/:id',         authRequired, adminOnly, affiliateAdminController.update.bind(affiliateAdminController));
router.patch('/admin/affiliates/:id/review',  authRequired, adminOnly, affiliateAdminController.review.bind(affiliateAdminController));
router.post('/admin/affiliates/:id/links',    authRequired, adminOnly, affiliateAdminController.createLink.bind(affiliateAdminController));
router.patch('/admin/affiliates/:id/links/:linkId', authRequired, adminOnly, affiliateAdminController.updateLink.bind(affiliateAdminController));
router.get('/admin/affiliate-settings',       authRequired, adminOnly, affiliateAdminController.settings.bind(affiliateAdminController));
router.patch('/admin/affiliate-settings',     authRequired, adminOnly, affiliateAdminController.updateSettings.bind(affiliateAdminController));
router.post('/admin/affiliates/:id/approve',  authRequired, adminOnly, affiliateAdminController.approve.bind(affiliateAdminController));
router.post('/admin/affiliates/:id/reject',   authRequired, adminOnly, affiliateAdminController.reject.bind(affiliateAdminController));
router.post('/admin/affiliates/:id/suspend',  authRequired, adminOnly, affiliateAdminController.suspend.bind(affiliateAdminController));
router.post('/admin/affiliates/:id/reactivate', authRequired, adminOnly, affiliateAdminController.reactivate.bind(affiliateAdminController));
router.post('/admin/affiliates/:id/payout',   authRequired, adminOnly, affiliateAdminController.payout.bind(affiliateAdminController));
router.get('/admin/commissions',              authRequired, adminOnly, affiliateAdminController.listCommissions.bind(affiliateAdminController));
router.post('/admin/commissions/bulk-approve', authRequired, adminOnly, affiliateAdminController.bulkApproveCommissions.bind(affiliateAdminController));
router.post('/admin/commissions/:id/approve', authRequired, adminOnly, affiliateAdminController.approveCommission.bind(affiliateAdminController));
router.post('/admin/commissions/:id/void',    authRequired, adminOnly, affiliateAdminController.voidCommission.bind(affiliateAdminController));
router.get('/admin/affiliate-payouts',        authRequired, adminOnly, affiliateAdminController.payouts.bind(affiliateAdminController));
router.get('/admin/affiliate-analytics',      authRequired, adminOnly, affiliateAdminController.analytics.bind(affiliateAdminController));
router.patch('/admin/affiliate-payouts/:id',  authRequired, adminOnly, affiliateAdminController.updatePayout.bind(affiliateAdminController));

export { router as affiliateRouter };
