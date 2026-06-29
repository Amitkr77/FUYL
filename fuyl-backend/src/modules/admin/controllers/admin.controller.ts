import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { adminDashboardService } from '../services';
import { success } from '../../../shared/responses';

export class AdminController {
  overview = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await adminDashboardService.getOverview());
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
