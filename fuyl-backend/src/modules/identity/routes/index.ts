import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { authLimiter } from '../../../shared/middleware/rateLimit.middleware';
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

// Authenticated routes
router.post('/auth/logout', authRequired, identityController.logout);
router.post('/auth/logout-all', authRequired, identityController.logoutAll);
router.get('/auth/me', authRequired, identityController.me);
router.patch('/auth/me', authRequired, identityController.updateMe);
router.post('/auth/change-password', authRequired, identityController.changePassword);
router.get('/auth/sessions', authRequired, identityController.listSessions);

// Health
router.get('/identity/health', (_req, res) => {
  res.json({ success: true, module: 'identity', status: 'active' });
});

export default router;
