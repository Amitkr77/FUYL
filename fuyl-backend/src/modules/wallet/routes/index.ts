import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { requirePermission, Permissions } from '../../../shared/middleware/rbac.middleware';
import { walletController } from '../controllers';

const router = Router();

// Customer-facing
router.get('/wallet/me', authRequired, walletController.getMyBalance);
router.get('/wallet/me/transactions', authRequired, walletController.getMyTransactions);

// Admin
router.get('/admin/wallet/:userId', authRequired, requirePermission(Permissions.WALLET_MANAGE), walletController.getUserBalance);
router.get('/admin/wallet/:userId/transactions', authRequired, requirePermission(Permissions.WALLET_MANAGE), walletController.listUserTransactions);
router.post('/admin/wallet/adjust', authRequired, requirePermission(Permissions.WALLET_MANAGE), walletController.adjustBalance);
router.post('/admin/wallet/:userId/freeze', authRequired, requirePermission(Permissions.WALLET_MANAGE), walletController.freeze);
router.post('/admin/wallet/:userId/unfreeze', authRequired, requirePermission(Permissions.WALLET_MANAGE), walletController.unfreeze);

// Health
router.get('/wallet/health', (_req, res) => {
  res.json({ success: true, module: 'wallet', status: 'active' });
});

export default router;
