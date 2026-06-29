import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { checkoutController } from '../controllers';

const router = Router();

router.post('/checkout/preview', authRequired, checkoutController.preview);
router.post('/checkout/place-order', authRequired, checkoutController.placeOrder);

// Health
router.get('/checkout/health', (_req, res) => {
  res.json({ success: true, module: 'checkout', status: 'active' });
});

export default router;
