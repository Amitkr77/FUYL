import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
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
router.post('/admin/referrals/programs', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), adminReferralController.createProgram);
router.get('/admin/referrals/programs', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), adminReferralController.listPrograms);
router.get('/admin/referrals/programs/:id', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), adminReferralController.getProgram);
router.patch('/admin/referrals/programs/:id', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), adminReferralController.updateProgram);
router.delete('/admin/referrals/programs/:id', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), adminReferralController.deactivateProgram);

// ─── Admin: dashboard & list ───────────────────────────────────────
router.get('/admin/referrals/stats', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), adminReferralController.stats);
router.get('/admin/referrals', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), adminReferralController.listAll);

// ─── Admin: moderation ─────────────────────────────────────────────
router.get('/admin/referrals/fraud', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), adminReferralController.listFraudFlags);
router.get('/admin/referrals/fraud/pending', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), adminReferralController.listPendingFraud);
router.post('/admin/referrals/fraud/:id/review', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), adminReferralController.reviewFraudFlag);

export default router;
