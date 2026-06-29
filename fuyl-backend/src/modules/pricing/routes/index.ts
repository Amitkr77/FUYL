import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { pricingController } from '../controllers';

const router = Router();

// Admin: Price Books
router.post(
  '/admin/pricing/price-books',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  pricingController.createPriceBook
);
router.get(
  '/admin/pricing/price-books',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  pricingController.listPriceBooks
);
router.get(
  '/admin/pricing/price-books/:id',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  pricingController.getPriceBook
);
router.patch(
  '/admin/pricing/price-books/:id',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  pricingController.updatePriceBook
);
router.delete(
  '/admin/pricing/price-books/:id',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  pricingController.deletePriceBook
);
router.post(
  '/admin/pricing/price-books/:id/activate',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  pricingController.activatePriceBook
);
router.post(
  '/admin/pricing/price-books/:id/archive',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  pricingController.archivePriceBook
);

// Admin: Tax Rules
router.post(
  '/admin/pricing/tax-rules',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  pricingController.createTaxRule
);
router.get(
  '/admin/pricing/tax-rules',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  pricingController.listTaxRules
);
router.get(
  '/admin/pricing/tax-rules/:id',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  pricingController.getTaxRule
);
router.patch(
  '/admin/pricing/tax-rules/:id',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  pricingController.updateTaxRule
);
router.delete(
  '/admin/pricing/tax-rules/:id',
  authRequired,
  authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
  pricingController.deleteTaxRule
);

// Quote (any authenticated user)
router.post('/pricing/quote', authRequired, pricingController.quote);

// Health
router.get('/pricing/health', (_req, res) => {
  res.json({ success: true, module: 'pricing', status: 'active' });
});

export default router;
