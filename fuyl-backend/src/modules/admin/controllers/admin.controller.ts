import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { adminDashboardService, adminCustomersService } from '../services';
import { success, paginate } from '../../../shared/responses';

export class AdminController {
  overview = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await adminDashboardService.getOverview());
    } catch (err) { next(err); }
  };

  listCustomers = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string | undefined;
      const result = await adminCustomersService.list(page, limit, search);
      return paginate(res, result.items, result.total, result.page, result.limit);
    } catch (err) { next(err); }
  };

  getCustomer = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await adminCustomersService.getById(req.params.id));
    } catch (err) { next(err); }
  };

  recentActivity = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(Number(req.query.limit ?? 50), 200);
      return success(res, await adminDashboardService.recentActivity(limit));
    } catch (err) { next(err); }
  };

  systemHealth = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await adminDashboardService.systemHealth());
    } catch (err) { next(err); }
  };
}

export const adminController = new AdminController();
