import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { authLimiter } from '../../../shared/middleware/rateLimit.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { identityController } from '../controllers';

const router = Router();

// Public routes (rate-limited)
router.post('/auth/register', authLimiter, identityController.register);
router.post('/auth/login', authLimiter, identityController.login);
router.post('/auth/refresh', authLimiter, identityController.refresh);
router.post('/auth/forgot-password', authLimiter, identityController.forgotPassword);
router.post('/auth/reset-password', authLimiter, identityController.resetPassword);
router.post('/auth/verify-email', identityController.verifyEmail);
router.post('/auth/resend-verification', authLimiter, identityController.resendVerification);
router.get('/auth/email-exists', authLimiter, identityController.emailExists);
router.post('/auth/checkout-identify', authLimiter, identityController.checkoutIdentify);

// Authenticated routes
router.post('/auth/logout', authRequired, identityController.logout);
router.post('/auth/logout-all', authRequired, identityController.logoutAll);
router.get('/auth/me', authRequired, identityController.me);
router.patch('/auth/me', authRequired, identityController.updateMe);
router.post('/auth/change-password', authRequired, identityController.changePassword);
router.get('/auth/sessions', authRequired, identityController.listSessions);

// Admin: grant/revoke granular permissions on a user (see rbac.middleware.ts)
router.patch(
  '/admin/users/:id/permissions',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  identityController.setPermissions
);

// Health
router.get('/identity/health', (_req, res) => {
  res.json({ success: true, module: 'identity', status: 'active' });
});

export default router;
