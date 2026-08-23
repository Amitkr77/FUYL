import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { requirePermission, Permissions } from '../../../shared/middleware/rbac.middleware';
import { referralController, adminReferralController } from '../controllers';

const router = Router();

// ─── Customer-facing ───────────────────────────────────────────────
router.post('/referrals/code', authRequired, referralController.generateCode);
router.get('/referrals/code', authRequired, referralController.getMyCode);
router.post('/referrals/apply', authRequired, referralController.applyCode);
router.get('/referrals/me', authRequired, referralController.dashboard);
router.get('/referrals/me/list', authRequired, referralController.listMine);
router.get('/referrals/me/rewards', authRequired, referralController.listMyRewards);
router.post('/referrals/share', authRequired, referralController.share);

// ─── Admin: programs ──────────────────────────────────────────────
router.post('/admin/referrals/programs', authRequired, requirePermission(Permissions.REFERRALS_MANAGE), adminReferralController.createProgram);
router.get('/admin/referrals/programs', authRequired, requirePermission(Permissions.REFERRALS_MANAGE), adminReferralController.listPrograms);
router.get('/admin/referrals/programs/:id', authRequired, requirePermission(Permissions.REFERRALS_MANAGE), adminReferralController.getProgram);
router.patch('/admin/referrals/programs/:id', authRequired, requirePermission(Permissions.REFERRALS_MANAGE), adminReferralController.updateProgram);
router.delete('/admin/referrals/programs/:id', authRequired, requirePermission(Permissions.REFERRALS_MANAGE), adminReferralController.deactivateProgram);

// ─── Admin: dashboard & list ───────────────────────────────────────
router.get('/admin/referrals/stats', authRequired, requirePermission(Permissions.REFERRALS_MANAGE), adminReferralController.stats);
router.get('/admin/referrals', authRequired, requirePermission(Permissions.REFERRALS_MANAGE), adminReferralController.listAll);

// ─── Admin: moderation ─────────────────────────────────────────────
router.get('/admin/referrals/fraud', authRequired, requirePermission(Permissions.REFERRALS_MANAGE), adminReferralController.listFraudFlags);
router.get('/admin/referrals/fraud/pending', authRequired, requirePermission(Permissions.REFERRALS_MANAGE), adminReferralController.listPendingFraud);
router.post('/admin/referrals/fraud/:id/review', authRequired, requirePermission(Permissions.REFERRALS_MANAGE), adminReferralController.reviewFraudFlag);

export default router;
