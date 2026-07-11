import { Router } from 'express';
import { authRequired, authOptional } from '../../../shared/middleware/auth.middleware';
import { authorize, requirePermission, Permissions, Roles } from '../../../shared/middleware/rbac.middleware';
import { planController, subscriptionController, adminSubscriptionController } from '../controllers';
import { razorpayWebhookHandler } from '../controllers';

const router = Router();

// ─── Public webhook (raw body) ─────────────────────────────────────
// NOTE: must be mounted BEFORE express.json() in app.ts
router.post('/webhooks/razorpay/subscription', razorpayWebhookHandler as any);

// ─── Customer-facing ───────────────────────────────────────────────
router.get('/subscriptions/plans', authOptional, planController.listActive);
router.post('/subscriptions', authRequired, subscriptionController.create);
router.get('/subscriptions/me', authRequired, subscriptionController.listMine);
router.get('/subscriptions/:id', authRequired, subscriptionController.get);
router.patch('/subscriptions/:id/pause', authRequired, subscriptionController.pause);
router.patch('/subscriptions/:id/resume', authRequired, subscriptionController.resume);
router.post('/subscriptions/:id/skip', authRequired, subscriptionController.skipNext);
router.patch('/subscriptions/:id/frequency', authRequired, subscriptionController.changeFrequency);
router.post('/subscriptions/:id/cancel', authRequired, subscriptionController.cancel);
router.get('/subscriptions/:id/deliveries', authRequired, subscriptionController.listDeliveries);
router.get('/subscriptions/:id/events', authRequired, subscriptionController.listEvents);

// ─── Admin: plans ──────────────────────────────────────────────────
router.post('/admin/subscription/plans', authRequired, requirePermission(Permissions.SUBSCRIPTIONS_MANAGE), planController.create);
router.get('/admin/subscription/plans', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), planController.list);
router.get('/admin/subscription/plans/:id', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), planController.get);
router.patch('/admin/subscription/plans/:id', authRequired, requirePermission(Permissions.SUBSCRIPTIONS_MANAGE), planController.update);
router.delete('/admin/subscription/plans/:id', authRequired, requirePermission(Permissions.SUBSCRIPTIONS_MANAGE), planController.deactivate);

// ─── Admin: dashboard ──────────────────────────────────────────────
router.get('/admin/subscription/dashboard', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), adminSubscriptionController.dashboard);
router.get('/admin/subscription', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), adminSubscriptionController.list);

export default router;
