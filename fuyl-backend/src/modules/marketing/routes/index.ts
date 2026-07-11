import { Router } from 'express';
import { marketingController } from '../controllers';

const router = Router();

// Public — paths match what fuyl-frontend already calls:
// contact/page.tsx -> POST /contact, lib/api/content.ts subscribeNewsletter -> POST /newsletter/subscribe
router.post('/contact', marketingController.submitContact);
router.post('/newsletter/subscribe', marketingController.subscribeNewsletter);

router.get('/marketing/health', (_req, res) => {
  res.json({ success: true, module: 'marketing', status: 'active' });
});

export default router;
