import { Router } from 'express';
import { authRequired, authOptional } from '../../../shared/middleware/auth.middleware';
import { cartController } from '../controllers';

const router = Router();

// Both guests and authenticated users can have carts.
// Guests pass an `x-guest-id` header (UUID generated client-side).
router.get('/cart', authOptional, cartController.getMine);
router.post('/cart/items', authOptional, cartController.addItem);
router.patch('/cart/items/:productId/:variantId', authOptional, cartController.updateItem);
router.patch('/cart/items/:productId', authOptional, cartController.updateItem);
router.delete('/cart/items/:productId/:variantId', authOptional, cartController.removeItem);
router.delete('/cart/items/:productId', authOptional, cartController.removeItem);
router.delete('/cart', authOptional, cartController.clear);
router.post('/cart/coupon', authOptional, cartController.applyCoupon);
router.delete('/cart/coupon', authOptional, cartController.removeCoupon);
router.post('/cart/referral', authOptional, cartController.applyReferral);

// Authenticated only — merge guest cart into user cart on login
router.post('/cart/merge', authRequired, cartController.merge);

// Health
router.get('/cart/health', (_req, res) => {
  res.json({ success: true, module: 'cart', status: 'active' });
});

export default router;
