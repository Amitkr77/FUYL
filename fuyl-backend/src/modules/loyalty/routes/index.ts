import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { loyaltyController } from '../controllers/loyalty.controller';

const router = Router();

// ─── Customer ─────────────────────────────────────────────────────────────────
router.get('/loyalty/me',                  authRequired, loyaltyController.getMyBalance);
router.get('/loyalty/me/transactions',     authRequired, loyaltyController.getMyTransactions);
router.get('/loyalty/me/preview-redemption', authRequired, loyaltyController.previewRedemption);

// ─── Admin: config ────────────────────────────────────────────────────────────
router.get('/admin/loyalty/config',        loyaltyController.getConfig);
router.get('/admin/loyalty/configs',       loyaltyController.listConfigs);
router.post('/admin/loyalty/config',       loyaltyController.createConfig);
router.patch('/admin/loyalty/config/:id',  loyaltyController.updateConfig);

// ─── Admin: transactions / manual adjust ─────────────────────────────────────
router.get('/admin/loyalty/transactions',  loyaltyController.getTransactions);
router.post('/admin/loyalty/adjust',       loyaltyController.adminAdjust);

export default router;
