import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { notificationController } from '../controllers';

const router = Router();

// User-facing
router.get('/notifications', authRequired, notificationController.listMine);
router.get('/notifications/preferences', authRequired, notificationController.getPreferences);
router.patch('/notifications/preferences', authRequired, notificationController.updatePreferences);
router.put(
  '/notifications/preferences/category',
  authRequired,
  notificationController.setCategoryOverride
);
router.post('/notifications/device-token', authRequired, notificationController.registerPushToken);
router.delete('/notifications/device-token', authRequired, notificationController.unregisterPushToken);

// Admin: Templates
router.get(
  '/admin/notifications/templates',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  notificationController.listTemplates
);
router.get(
  '/admin/notifications/templates/:id',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  notificationController.getTemplate
);
router.post(
  '/admin/notifications/templates',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  notificationController.createTemplate
);
router.patch(
  '/admin/notifications/templates/:id',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  notificationController.updateTemplate
);
router.delete(
  '/admin/notifications/templates/:id',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  notificationController.deactivateTemplate
);

// Admin: Logs
router.get(
  '/admin/notifications/logs',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  notificationController.listLogs
);
router.post(
  '/admin/notifications/retry-failed',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  notificationController.retryFailed
);
router.get(
  '/admin/notifications/stats',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  notificationController.stats
);

// Health
router.get('/notifications/health', (_req, res) => {
  res.json({ success: true, module: 'notification', status: 'active' });
});

export default router;
