import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { discountService } from '../services';
import { success, created, paginate } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import { createDiscountSchema, updateDiscountSchema, validateCouponSchema } from '../validators';

export class DiscountController {
  // ─── Admin: Discounts ─────────────────────────────────────────
  createDiscount = [
    validate(createDiscountSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return created(res, await discountService.createDiscount(req.body));
      } catch (err) { next(err); }
    },
  ];

  listDiscounts = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Math.min(Number(req.query.limit ?? 20), 100);
      const filter: Record<string, unknown> = {};
      if (req.query.status) filter.status = req.query.status;
      if (req.query.type) filter.type = req.query.type;
      if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
      const result = await discountService.listDiscounts(page, limit, filter);
      return paginate(res, result.items, result.total, result.page, result.limit);
    } catch (err) { next(err); }
  };

  getDiscount = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await discountService.getDiscount(req.params.id));
    } catch (err) { next(err); }
  };

  updateDiscount = [
    validate(updateDiscountSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await discountService.updateDiscount(req.params.id, req.body));
      } catch (err) { next(err); }
    },
  ];

  deleteDiscount = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      await discountService.deleteDiscount(req.params.id);
      return success(res, { deleted: true });
    } catch (err) { next(err); }
  };

  // ─── Admin: Redemptions ──────────────────────────────────────
  listRedemptions = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Math.min(Number(req.query.limit ?? 20), 100);
      const filter: Record<string, unknown> = {};
      if (req.query.code) filter.couponCode = String(req.query.code).toUpperCase();
      if (req.query.userId) filter.userId = req.query.userId;
      if (req.query.status) filter.status = req.query.status;
      const result = await discountService.listRedemptions(filter, page, limit);
      return paginate(res, result.items, result.total, result.page, result.limit);
    } catch (err) { next(err); }
  };

  stats = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await discountService.stats());
    } catch (err) { next(err); }
  };

  // ─── Customer-facing ──────────────────────────────────────────
  listActive = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await discountService.listActive());
    } catch (err) { next(err); }
  };

  listFeatured = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await discountService.listFeatured());
    } catch (err) { next(err); }
  };

  validateCoupon = [
    validate(validateCouponSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const result = await discountService.validateCoupon(req.user?.userId, req.body);
        return success(res, result);
      } catch (err) { next(err); }
    },
  ];

  listMyRedemptions = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await discountService.listMyRedemptions(req.user!.userId));
    } catch (err) { next(err); }
  };
}

export const discountController = new DiscountController();
