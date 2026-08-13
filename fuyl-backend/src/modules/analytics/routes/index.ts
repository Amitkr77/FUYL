import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { analyticsController } from '../controllers';

const router = Router();

// ── Public ────────────────────────────────────────────────────────────────────
// Storefront sends page-view / interaction events here (no auth required).
router.post('/analytics/track', analyticsController.track);

// ── Admin-only ────────────────────────────────────────────────────────────────
const adminGuard = [authRequired, authorize(Roles.ADMIN, Roles.SUPER_ADMIN)];

router.get('/admin/analytics/summary',              ...adminGuard, analyticsController.summary);
router.get('/admin/analytics/timeseries/:event',    ...adminGuard, analyticsController.timeseries);
router.get('/admin/analytics/revenue',              ...adminGuard, analyticsController.revenueTimeseries);
router.get('/admin/analytics/cart-abandonment',     ...adminGuard, analyticsController.cartAbandonment);
router.get('/admin/analytics/funnel',               ...adminGuard, analyticsController.funnel);
router.get('/admin/analytics/heatmap',              ...adminGuard, analyticsController.heatmap);
router.get('/admin/analytics/devices',              ...adminGuard, analyticsController.deviceBreakdown);
router.get('/admin/analytics/user-activity',        ...adminGuard, analyticsController.userActivity);
router.get('/admin/analytics/geography',            ...adminGuard, analyticsController.geography);
router.get('/admin/analytics/customer-segments',    ...adminGuard, analyticsController.customerSegments);
router.get('/admin/analytics/orders-by-status',     ...adminGuard, analyticsController.ordersByStatus);
router.get('/admin/analytics/top-products',         ...adminGuard, analyticsController.topProducts);
router.get('/admin/analytics/events/recent',        ...adminGuard, analyticsController.recentEvents);
router.get('/admin/analytics/metrics',              ...adminGuard, analyticsController.metrics);
router.post('/admin/analytics/rollup', authRequired, authorize(Roles.SUPER_ADMIN), analyticsController.forceRollup);

// ── Health ────────────────────────────────────────────────────────────────────
router.get('/analytics/health', (_req, res) => {
  res.json({ success: true, module: 'analytics', status: 'active' });
});

export default router;
