import { Router } from 'express';
import { authRequired, authOptional } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { reviewController } from '../controllers';

const router = Router();

// Health — must be registered before '/reviews/:id' below, otherwise
// Express matches "health" as the :id param first and getById() 400s on
// the invalid ObjectId, permanently shadowing this route (found live).
router.get('/reviews/health', (_req, res) => {
  res.json({ success: true, module: 'review', status: 'active' });
});

// Public (browse reviews on a product)
router.get('/reviews/product/:productId', authOptional, reviewController.listByProduct);
router.get('/reviews/product/:productId/summary', authOptional, reviewController.getRatingSummary);
router.get('/reviews/:id', authOptional, reviewController.getById);

// Authenticated
router.post('/reviews', authRequired, reviewController.create);
router.get('/reviews/mine', authRequired, reviewController.listMine);
router.patch('/reviews/:id', authRequired, reviewController.update);
router.delete('/reviews/:id', authRequired, reviewController.delete);
router.post('/reviews/:id/helpful', authRequired, reviewController.markHelpful);
router.post('/reviews/:id/report', authRequired, reviewController.report);
router.post(
  '/reviews/:id/reply',
  authRequired,
  authorize(Roles.SELLER, Roles.ADMIN, Roles.SUPER_ADMIN),
  reviewController.sellerReply
);

// Admin
router.get(
  '/admin/reviews',
  authRequired,
  authorize(Roles.ADMIN, Roles.SUPER_ADMIN),
  reviewController.listAll
);
router.get(
  '/admin/reviews/pending',
  authRequired,
  authorize(Roles.ADMIN, Roles.SUPER_ADMIN),
  reviewController.listPending
);
router.get(
  '/admin/reviews/flagged',
  authRequired,
  authorize(Roles.ADMIN, Roles.SUPER_ADMIN),
  reviewController.listFlagged
);
router.patch(
  '/admin/reviews/:id/moderate',
  authRequired,
  authorize(Roles.ADMIN, Roles.SUPER_ADMIN),
  reviewController.moderate
);

export default router;
