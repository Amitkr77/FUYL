import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { planService } from '../services/plan.service';
import { success, created, paginate } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import { createPlanSchema, updatePlanSchema } from '../validators';
import { Roles } from '../../../shared/middleware/rbac.middleware';

export class PlanController {
  create = [
    validate(createPlanSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const plan = await planService.create(req.body);
        return created(res, plan);
      } catch (err) { next(err); }
    },
  ];

  list = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await planService.listAll(page, limit);
      return paginate(res, result.items, result.total, result.page, result.limit);
    } catch (err) { next(err); }
  };

  listActive = async (_req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const plans = await planService.listActive();
      return success(res, plans);
    } catch (err) { next(err); }
  };

  get = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await planService.get(req.params.id));
    } catch (err) { next(err); }
  };

  update = [
    validate(updatePlanSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await planService.update(req.params.id, req.body));
      } catch (err) { next(err); }
    },
  ];

  deactivate = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      await planService.deactivate(req.params.id);
      return success(res, { deactivated: true });
    } catch (err) { next(err); }
  };
}

export const planController = new PlanController();
