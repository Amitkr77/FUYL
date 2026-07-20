import { Router } from 'express';
import { marketingController, adminNewsletterController } from '../controllers';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { newsletterLimiter } from '../../../shared/middleware/rateLimit.middleware';

const router = Router();

// Public — paths match what fuyl-frontend already calls:
// contact/page.tsx -> POST /contact, lib/api/content.ts subscribeNewsletter -> POST /newsletter/subscribe
router.post('/contact', marketingController.submitContact);

// Newsletter (double opt-in). Subscribe + resend are rate-limited since they
// trigger outbound email; verify/unsubscribe act on a token the user already holds.
router.post('/newsletter/subscribe', newsletterLimiter, marketingController.subscribeNewsletter);
router.post('/newsletter/verify', marketingController.verifyNewsletter);
router.post('/newsletter/unsubscribe', marketingController.unsubscribeNewsletter);
router.post('/newsletter/resend', newsletterLimiter, marketingController.resendNewsletterVerification);

// Admin — subscriber management (guarded by authRequired + role check inside each handler array)
router.get('/admin/newsletter/stats', authRequired, adminNewsletterController.stats);
router.get('/admin/newsletter', authRequired, adminNewsletterController.list);
router.post('/admin/newsletter/:email/resend', authRequired, adminNewsletterController.resendVerification);
router.delete('/admin/newsletter/:id', authRequired, adminNewsletterController.remove);

router.get('/marketing/health', (_req, res) => {
  res.json({ success: true, module: 'marketing', status: 'active' });
});

export default router;
