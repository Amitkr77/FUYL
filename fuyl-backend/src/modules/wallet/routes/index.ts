import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { walletController } from '../controllers';

const router = Router();

// Customer-facing
router.get('/wallet/me', authRequired, walletController.getMyBalance);
router.get('/wallet/me/transactions', authRequired, walletController.getMyTransactions);

// Admin
router.get('/admin/wallet/:userId', authRequired, walletController.getUserBalance);
router.get('/admin/wallet/:userId/transactions', authRequired, walletController.listUserTransactions);
router.post('/admin/wallet/adjust', authRequired, walletController.adjustBalance);
router.post('/admin/wallet/:userId/freeze', authRequired, walletController.freeze);
router.post('/admin/wallet/:userId/unfreeze', authRequired, walletController.unfreeze);

// Health
router.get('/wallet/health', (_req, res) => {
  res.json({ success: true, module: 'wallet', status: 'active' });
});

export default router;
