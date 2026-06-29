import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { adminController } from '../controllers';

const router = Router();

// All admin routes require admin/super_admin
router.use(authRequired, authorize(Roles.ADMIN, Roles.SUPER_ADMIN));

router.get('/admin/overview', adminController.overview);
router.get('/admin/recent-activity', adminController.recentActivity);
router.get('/admin/system-health', adminController.systemHealth);

// Health
router.get('/admin/health', (_req, res) => {
  res.json({ success: true, module: 'admin', status: 'active' });
});

export default router;
