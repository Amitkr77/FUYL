import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { promotionService } from '../services';
import { success, created, paginate } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import { createCampaignSchema, updateCampaignSchema, validateCouponSchema } from '../validators';

export class PromotionController {
  // ─── Admin: Campaigns ─────────────────────────────────────────
  createCampaign = [
    validate(createCampaignSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return created(res, await promotionService.createCampaign(req.body));
      } catch (err) { next(err); }
    },
  ];

  listCampaigns = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Math.min(Number(req.query.limit ?? 20), 100);
      const filter: Record<string, unknown> = {};
      if (req.query.status) filter.status = req.query.status;
      if (req.query.type) filter.type = req.query.type;
      if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
      const result = await promotionService.listCampaigns(page, limit, filter);
      return paginate(res, result.items, result.total, result.page, result.limit);
    } catch (err) { next(err); }
  };

  getCampaign = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await promotionService.getCampaign(req.params.id));
    } catch (err) { next(err); }
  };

  updateCampaign = [
    validate(updateCampaignSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await promotionService.updateCampaign(req.params.id, req.body));
      } catch (err) { next(err); }
    },
  ];

  deleteCampaign = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      await promotionService.deleteCampaign(req.params.id);
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
      const result = await promotionService.listRedemptions(filter, page, limit);
      return paginate(res, result.items, result.total, result.page, result.limit);
    } catch (err) { next(err); }
  };

  stats = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await promotionService.stats());
    } catch (err) { next(err); }
  };

  // ─── Customer-facing ──────────────────────────────────────────
  listActive = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await promotionService.listActive());
    } catch (err) { next(err); }
  };

  listFeatured = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await promotionService.listFeatured());
    } catch (err) { next(err); }
  };

  validateCoupon = [
    validate(validateCouponSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const result = await promotionService.validateCoupon(req.user?.userId, req.body);
        return success(res, result);
      } catch (err) { next(err); }
    },
  ];

  listMyRedemptions = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await promotionService.listMyRedemptions(req.user!.userId));
    } catch (err) { next(err); }
  };
}

export const promotionController = new PromotionController();
