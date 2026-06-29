import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { analyticsController } from '../controllers';

const router = Router();

// Admin-only
router.get(
  '/admin/analytics/summary',
  authRequired,
  authorize(Roles.ADMIN, Roles.SUPER_ADMIN),
  analyticsController.summary
);
router.get(
  '/admin/analytics/timeseries/:event',
  authRequired,
  authorize(Roles.ADMIN, Roles.SUPER_ADMIN),
  analyticsController.timeseries
);
router.get(
  '/admin/analytics/events/recent',
  authRequired,
  authorize(Roles.ADMIN, Roles.SUPER_ADMIN),
  analyticsController.recentEvents
);
router.get(
  '/admin/analytics/metrics',
  authRequired,
  authorize(Roles.ADMIN, Roles.SUPER_ADMIN),
  analyticsController.metrics
);
router.post(
  '/admin/analytics/rollup',
  authRequired,
  authorize(Roles.SUPER_ADMIN),
  analyticsController.forceRollup
);

// Health
router.get('/analytics/health', (_req, res) => {
  res.json({ success: true, module: 'analytics', status: 'active' });
});

export default router;
