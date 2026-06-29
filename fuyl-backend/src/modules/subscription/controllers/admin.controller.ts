import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { success, paginate } from '../../../shared/responses';
import { authorize } from '../../../shared/middleware/rbac.middleware';
import { Roles } from '../../../shared/middleware/rbac.middleware';

const subRepo = new SubscriptionRepository();

export class AdminSubscriptionController {
  dashboard = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (_req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const stats = await subRepo.statsForAdmin();
        return success(res, stats);
      } catch (err) { next(err); }
    },
  ];

  list = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const filter: Record<string, unknown> = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.customerId) filter.customerId = req.query.customerId;
        const result = await subRepo.paginate(filter, page, limit);
        return paginate(res, result.items, result.total, result.page, result.limit);
      } catch (err) { next(err); }
    },
  ];
}

export const adminSubscriptionController = new AdminSubscriptionController();
