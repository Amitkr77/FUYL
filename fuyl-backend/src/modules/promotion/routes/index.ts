import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { promotionController } from '../controllers';

const router = Router();

// Customer-facing
router.get('/promotions/active', authRequired, promotionController.listActive);
router.get('/promotions/featured', authRequired, promotionController.listFeatured);
router.post('/promotions/validate-coupon', authRequired, promotionController.validateCoupon);
router.get('/promotions/my-redemptions', authRequired, promotionController.listMyRedemptions);

// Admin: Campaigns
router.post(
  '/admin/promotions/campaigns',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  promotionController.createCampaign
);
router.get(
  '/admin/promotions/campaigns',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  promotionController.listCampaigns
);
router.get(
  '/admin/promotions/campaigns/:id',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  promotionController.getCampaign
);
router.patch(
  '/admin/promotions/campaigns/:id',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  promotionController.updateCampaign
);
router.delete(
  '/admin/promotions/campaigns/:id',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  promotionController.deleteCampaign
);

// Admin: Redemptions + stats
router.get(
  '/admin/promotions/redemptions',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  promotionController.listRedemptions
);
router.get(
  '/admin/promotions/stats',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  promotionController.stats
);

// Health
router.get('/promotions/health', (_req, res) => {
  res.json({ success: true, module: 'promotion', status: 'active' });
});

export default router;
