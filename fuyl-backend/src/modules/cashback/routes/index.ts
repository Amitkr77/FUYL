import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { cashbackController } from '../controllers/cashback.controller';

const router = Router();

// ─── Customer ────────────────────────────────────────────────────────────────
router.get('/cashback/me', authRequired, cashbackController.getMyEarnings);

// ─── Admin: policies ─────────────────────────────────────────────────────────
router.get('/admin/cashback/policies', cashbackController.listPolicies);
router.get('/admin/cashback/policies/:id', cashbackController.getPolicy);
router.post('/admin/cashback/policies', cashbackController.createPolicy);
router.patch('/admin/cashback/policies/:id', cashbackController.updatePolicy);
router.delete('/admin/cashback/policies/:id', cashbackController.deletePolicy);

// ─── Admin: earnings audit ────────────────────────────────────────────────────
router.get('/admin/cashback/earnings', cashbackController.listEarnings);

export default router;
