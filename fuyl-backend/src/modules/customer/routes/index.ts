import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { customerController } from '../controllers';

const router = Router();

// Profile
router.get('/customer/profile', authRequired, customerController.getProfile);
router.patch('/customer/profile', authRequired, customerController.updateProfile);

// Addresses
router.get('/customer/addresses', authRequired, customerController.listAddresses);
router.post('/customer/addresses', authRequired, customerController.addAddress);
router.patch('/customer/addresses/:id', authRequired, customerController.updateAddress);
router.delete('/customer/addresses/:id', authRequired, customerController.removeAddress);

// Wishlist
router.get('/customer/wishlist', authRequired, customerController.getWishlist);
router.post('/customer/wishlist', authRequired, customerController.addToWishlist);
router.delete('/customer/wishlist/:productId', authRequired, customerController.removeFromWishlist);

// Loyalty
router.get('/customer/loyalty', authRequired, customerController.getLoyalty);

// Health
router.get('/customer/health', (_req, res) => {
  res.json({ success: true, module: 'customer', status: 'active' });
});

export default router;
