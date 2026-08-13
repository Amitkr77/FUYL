import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { cashbackService } from '../services/cashback.service';
import { success, paginate } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import { authorize, requirePermission, Permissions, Roles } from '../../../shared/middleware/rbac.middleware';
import {
  createPolicySchema,
  updatePolicySchema,
  listPoliciesSchema,
  listEarningsSchema,
} from '../validators';

export class CashbackController {
  // ─── Customer routes ──────────────────────────────────────────────────────

  /** GET /cashback/me — customer's own earning history */
  getMyEarnings = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 20));
      const result = await cashbackService.getUserEarnings(req.user!.userId, page, limit);
      return paginate(res, result.items, result.total, result.page, result.limit);
    } catch (err) { next(err); }
  };

  // ─── Admin: policy management ─────────────────────────────────────────────

  listPolicies = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    validate(listPoliciesSchema, 'query'),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        // req.query is already validated by Zod schema above
        const page  = Number(req.query.page)  || 1;
        const limit = Number(req.query.limit) || 20;
        const filter: Record<string, unknown> = {};
        if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
        if (req.query.mode)                   filter.mode     = req.query.mode;
        const result = await cashbackService.listPolicies(filter, page, limit);
        return paginate(res, result.items, result.total, result.page, result.limit);
      } catch (err) { next(err); }
    },
  ];

  getPolicy = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await cashbackService.getPolicy(req.params.id));
      } catch (err) { next(err); }
    },
  ];

  createPolicy = [
    requirePermission(Permissions.DISCOUNTS_MANAGE),
    validate(createPolicySchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const policy = await cashbackService.createPolicy(req.body);
        return success(res, policy, 201);
      } catch (err) { next(err); }
    },
  ];

  updatePolicy = [
    requirePermission(Permissions.DISCOUNTS_MANAGE),
    validate(updatePolicySchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await cashbackService.updatePolicy(req.params.id, req.body));
      } catch (err) { next(err); }
    },
  ];

  deletePolicy = [
    requirePermission(Permissions.DISCOUNTS_MANAGE),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        await cashbackService.deletePolicy(req.params.id);
        return success(res, { deleted: true });
      } catch (err) { next(err); }
    },
  ];

  // ─── Admin: earning audit ─────────────────────────────────────────────────

  listEarnings = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    validate(listEarningsSchema, 'query'),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const page  = Number(req.query.page)  || 1;
        const limit = Number(req.query.limit) || 20;
        // Validated ObjectIds from query string — safe to pass directly as filter
        const filter: Record<string, unknown> = {};
        if (req.query.status)  filter.status  = req.query.status;
        if (req.query.userId)  filter.userId  = req.query.userId;
        if (req.query.orderId) filter.orderId = req.query.orderId;
        const result = await cashbackService.listEarnings(filter, page, limit);
        return paginate(res, result.items, result.total, result.page, result.limit);
      } catch (err) { next(err); }
    },
  ];
}

export const cashbackController = new CashbackController();
