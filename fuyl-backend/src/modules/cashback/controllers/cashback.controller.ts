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
      const page  = parseInt(req.query.page  as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
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
        const { page, limit, isActive, mode } = req.query as any;
        const filter: Record<string, unknown> = {};
        if (isActive !== undefined) filter.isActive = isActive === 'true';
        if (mode)                   filter.mode = mode;
        const result = await cashbackService.listPolicies(filter, Number(page) || 1, Number(limit) || 20);
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
    requirePermission(Permissions.PROMOTIONS_MANAGE),
    validate(createPolicySchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const policy = await cashbackService.createPolicy(req.body);
        return success(res, policy, 201);
      } catch (err) { next(err); }
    },
  ];

  updatePolicy = [
    requirePermission(Permissions.PROMOTIONS_MANAGE),
    validate(updatePolicySchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await cashbackService.updatePolicy(req.params.id, req.body));
      } catch (err) { next(err); }
    },
  ];

  deletePolicy = [
    requirePermission(Permissions.PROMOTIONS_MANAGE),
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
        const { page, limit, status, userId, orderId } = req.query as any;
        const filter: Record<string, unknown> = {};
        if (status)  filter.status  = status;
        if (userId)  filter.userId  = userId;
        if (orderId) filter.orderId = orderId;
        const result = await cashbackService.listEarnings(filter, Number(page) || 1, Number(limit) || 20);
        return paginate(res, result.items, result.total, result.page, result.limit);
      } catch (err) { next(err); }
    },
  ];
}

export const cashbackController = new CashbackController();
