import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { loyaltyController } from '../controllers/loyalty.controller';

const router = Router();

// ─── Customer ─────────────────────────────────────────────────────────────────
router.get('/loyalty/me',                  authRequired, loyaltyController.getMyBalance);
router.get('/loyalty/me/transactions',     authRequired, loyaltyController.getMyTransactions);
router.get('/loyalty/me/preview-redemption', authRequired, loyaltyController.previewRedemption);

// ─── Admin: config ────────────────────────────────────────────────────────────
router.get('/admin/loyalty/config',        authRequired, loyaltyController.getConfig);
router.get('/admin/loyalty/configs',       authRequired, loyaltyController.listConfigs);
router.post('/admin/loyalty/config',       authRequired, loyaltyController.createConfig);
router.patch('/admin/loyalty/config/:id',  authRequired, loyaltyController.updateConfig);

// ─── Admin: transactions / manual adjust ─────────────────────────────────────
router.get('/admin/loyalty/transactions',  authRequired, loyaltyController.getTransactions);
router.get('/admin/loyalty/accounts/:userId', authRequired, loyaltyController.getAccount);
router.post('/admin/loyalty/adjust',       authRequired, loyaltyController.adminAdjust);

export default router;
