import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { uploadController } from '../controllers';

const router = Router();

// Any authenticated user can request a signed upload (customers upload
// avatars/review images, admin/seller upload product/blog images) — the
// `folder` param scopes where it lands, not who can call this.
router.post('/uploads/sign', authRequired, uploadController.sign);

router.get('/uploads/health', (_req, res) => {
  res.json({ success: true, module: 'upload', status: 'active' });
});

export default router;
