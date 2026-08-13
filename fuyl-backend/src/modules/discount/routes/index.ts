import { Router } from 'express';
import { authRequired, authOptional } from '../../../shared/middleware/auth.middleware';
import { authorize, requirePermission, Permissions, Roles } from '../../../shared/middleware/rbac.middleware';
import { discountController } from '../controllers';

const router = Router();

// Customer-facing
router.get('/discounts/active', authRequired, discountController.listActive);
router.get('/discounts/featured', authRequired, discountController.listFeatured);
// authOptional — checkout lets a not-yet-identified guest validate/apply a
// coupon before their account exists. Per-user limits (max redemptions,
// first-order-only) simply can't be checked yet without an identity; those
// are re-verified authoritatively once the same code flows through
// checkout.service.ts's preview()/placeOrder() with a resolved userId.
router.post('/discounts/validate', authOptional, discountController.validateCoupon);
router.get('/discounts/my-redemptions', authRequired, discountController.listMyRedemptions);

// Admin: Discounts
router.post('/admin/discounts', authRequired, requirePermission(Permissions.DISCOUNTS_MANAGE), discountController.createDiscount);
router.get('/admin/discounts', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), discountController.listDiscounts);
router.get('/admin/discounts/:id', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), discountController.getDiscount);
router.patch('/admin/discounts/:id', authRequired, requirePermission(Permissions.DISCOUNTS_MANAGE), discountController.updateDiscount);
router.delete('/admin/discounts/:id', authRequired, requirePermission(Permissions.DISCOUNTS_MANAGE), discountController.deleteDiscount);
router.get('/admin/discount-redemptions', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), discountController.listRedemptions);
router.get('/admin/discount-stats', authRequired, authorize(Roles.SUPER_ADMIN, Roles.ADMIN), discountController.stats);

// Admin: Redemptions + stats

// Health
router.get('/discounts/health', (_req, res) => {
  res.json({ success: true, module: 'discount', status: 'active' });
});

export default router;
