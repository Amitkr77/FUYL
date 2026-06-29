import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { pricingService } from '../services';
import { success, created, paginate } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import {
  createPriceBookSchema,
  updatePriceBookSchema,
  createTaxRuleSchema,
  updateTaxRuleSchema,
} from '../validators';

export class PricingController {
  // ─── Price Books (admin) ──────────────────────────────────────
  createPriceBook = [
    validate(createPriceBookSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return created(res, await pricingService.createPriceBook(req.body));
      } catch (err) { next(err); }
    },
  ];

  listPriceBooks = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Math.min(Number(req.query.limit ?? 20), 100);
      const filter: Record<string, unknown> = {};
      if (req.query.type) filter.type = req.query.type;
      if (req.query.status) filter.status = req.query.status;
      if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
      const result = await pricingService.listPriceBooks(page, limit, filter);
      return paginate(res, result.items, result.total, result.page, result.limit);
    } catch (err) { next(err); }
  };

  getPriceBook = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await pricingService.getPriceBook(req.params.id));
    } catch (err) { next(err); }
  };

  updatePriceBook = [
    validate(updatePriceBookSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await pricingService.updatePriceBook(req.params.id, req.body));
      } catch (err) { next(err); }
    },
  ];

  deletePriceBook = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      await pricingService.deletePriceBook(req.params.id);
      return success(res, { deleted: true });
    } catch (err) { next(err); }
  };

  activatePriceBook = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await pricingService.activatePriceBook(req.params.id));
    } catch (err) { next(err); }
  };

  archivePriceBook = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await pricingService.archivePriceBook(req.params.id));
    } catch (err) { next(err); }
  };

  // ─── Tax Rules (admin) ────────────────────────────────────────
  createTaxRule = [
    validate(createTaxRuleSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return created(res, await pricingService.createTaxRule(req.body));
      } catch (err) { next(err); }
    },
  ];

  listTaxRules = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const activeOnly = req.query.active === 'true';
      return success(res, await pricingService.listTaxRules(activeOnly));
    } catch (err) { next(err); }
  };

  getTaxRule = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await pricingService.getTaxRule(req.params.id));
    } catch (err) { next(err); }
  };

  updateTaxRule = [
    validate(updateTaxRuleSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await pricingService.updateTaxRule(req.params.id, req.body));
      } catch (err) { next(err); }
    },
  ];

  deleteTaxRule = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      await pricingService.deleteTaxRule(req.params.id);
      return success(res, { deleted: true });
    } catch (err) { next(err); }
  };

  // ─── Quote (anyone authenticated) ─────────────────────────────
  quote = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const { items, state, country, currency } = req.body as {
        items: Array<{
          productId: string;
          variantId?: string;
          quantity: number;
          basePrice: number;
          sellerId?: string;
          categoryIds?: string[];
          isSubscription?: boolean;
        }>;
        state?: string;
        country?: string;
        currency?: string;
      };
      const quote = await pricingService.quote(
        items.map((i) => ({ ...i, customerRole: req.user?.role })),
        { state, country, currency }
      );
      return success(res, quote);
    } catch (err) { next(err); }
  };
}

export const pricingController = new PricingController();
