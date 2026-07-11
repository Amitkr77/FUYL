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
        // Attach product name so the admin UI doesn't need an N+1 lookup per row.
        const { ProductModel } = await import('../../catalog/models/product.model');
        const productIds = [...new Set(result.items.map((s) => s.productId.toString()))];
        const products = await ProductModel.find({ _id: { $in: productIds } }, { name: 1 });
        const nameById = new Map(products.map((p) => [p._id.toString(), p.name]));
        const items = result.items.map((s) => ({
          ...s.toObject(),
          productName: nameById.get(s.productId.toString()) ?? 'Unknown product',
        }));
        return paginate(res, items, result.total, result.page, result.limit);
      } catch (err) { next(err); }
    },
  ];
}

export const adminSubscriptionController = new AdminSubscriptionController();
