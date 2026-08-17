import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { cashbackController } from '../controllers/cashback.controller';

const router = Router();

// ─── Customer ────────────────────────────────────────────────────────────────
router.get('/cashback/me', authRequired, cashbackController.getMyEarnings);

// ─── Admin: policies ─────────────────────────────────────────────────────────
router.get('/admin/cashback/policies', authRequired, cashbackController.listPolicies);
router.get('/admin/cashback/policies/:id', authRequired, cashbackController.getPolicy);
router.post('/admin/cashback/policies', authRequired, cashbackController.createPolicy);
router.patch('/admin/cashback/policies/:id', authRequired, cashbackController.updatePolicy);
router.delete('/admin/cashback/policies/:id', authRequired, cashbackController.deletePolicy);

// ─── Admin: earnings audit ────────────────────────────────────────────────────
router.get('/admin/cashback/earnings', authRequired, cashbackController.listEarnings);

export default router;
