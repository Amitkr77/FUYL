import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { loyaltyService } from '../services/loyalty.service';
import { success, paginate } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import { authorize, requirePermission, Permissions, Roles } from '../../../shared/middleware/rbac.middleware';
import {
  createConfigSchema,
  updateConfigSchema,
  adminAdjustSchema,
  listTransactionsSchema,
  previewRedemptionSchema,
} from '../validators';

export class LoyaltyController {
  // ─── Customer routes ────────────────────────────────────────────────────────

  /** GET /loyalty/me — current user's points balance */
  getMyBalance = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const result = await loyaltyService.getBalance(req.user!.userId);
      return success(res, result);
    } catch (err) { next(err); }
  };

  /** GET /loyalty/me/transactions?page&limit */
  getMyTransactions = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const result = await loyaltyService.getTransactions(req.user!.userId, page, limit);
      return paginate(res, result.items, result.total, result.page, result.limit);
    } catch (err) { next(err); }
  };

  /** GET /loyalty/me/preview-redemption?orderTotal=X */
  previewRedemption = [
    validate(previewRedemptionSchema, 'query'),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const orderTotal = Number(req.query.orderTotal) || 0;
        const result = await loyaltyService.previewRedemption(req.user!.userId, orderTotal);
        return success(res, result);
      } catch (err) { next(err); }
    },
  ];

  // ─── Admin: config management ────────────────────────────────────────────────

  /** GET /admin/loyalty/config */
  getConfig = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const config = await loyaltyService.getConfig();
        return success(res, config);
      } catch (err) { next(err); }
    },
  ];

  /** GET /admin/loyalty/configs */
  listConfigs = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const configs = await loyaltyService.listConfigs();
        return success(res, configs);
      } catch (err) { next(err); }
    },
  ];

  /** POST /admin/loyalty/config */
  createConfig = [
    requirePermission(Permissions.DISCOUNTS_MANAGE),
    validate(createConfigSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const config = await loyaltyService.createConfig(req.body);
        return success(res, config, 201);
      } catch (err) { next(err); }
    },
  ];

  /** PATCH /admin/loyalty/config/:id */
  updateConfig = [
    requirePermission(Permissions.DISCOUNTS_MANAGE),
    validate(updateConfigSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const config = await loyaltyService.updateConfig(req.params.id, req.body);
        return success(res, config);
      } catch (err) { next(err); }
    },
  ];

  // ─── Admin: transaction audit ────────────────────────────────────────────────

  /** GET /admin/loyalty/transactions?userId&page&limit */
  getTransactions = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    validate(listTransactionsSchema, 'query'),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const page    = Number(req.query.page)  || 1;
        const limit   = Number(req.query.limit) || 20;
        const userId  = req.query.userId as string;
        if (!userId) {
          return success(res, { items: [], total: 0, page, limit });
        }
        const result = await loyaltyService.getTransactions(userId, page, limit);
        return paginate(res, result.items, result.total, result.page, result.limit);
      } catch (err) { next(err); }
    },
  ];

  /** POST /admin/loyalty/adjust */
  adminAdjust = [
    requirePermission(Permissions.DISCOUNTS_MANAGE),
    validate(adminAdjustSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        await loyaltyService.adminAdjust(req.body.userId, req.body.points, req.body.description);
        return success(res, { adjusted: true });
      } catch (err) { next(err); }
    },
  ];
}

export const loyaltyController = new LoyaltyController();
