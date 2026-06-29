import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { paymentService } from '../services';
import { success, created, paginate } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import { createPaymentSchema, verifyPaymentSchema, refundSchema } from '../validators';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';

export class PaymentController {
  createPayment = [
    validate(createPaymentSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return created(res, await paymentService.createPayment(req.user!.userId, req.body.orderId, req.body.method));
      } catch (err) { next(err); }
    },
  ];

  verifyPayment = [
    validate(verifyPaymentSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await paymentService.verifyPayment(req.user!.userId, req.body));
      } catch (err) { next(err); }
    },
  ];

  listMine = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await paymentService.listMine(req.user!.userId));
    } catch (err) { next(err); }
  };

  listByOrder = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await paymentService.listByOrder(req.params.orderId));
    } catch (err) { next(err); }
  };

  // ─── Admin ──────────────────────────────────────────────────────
  listAll = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const r = await paymentService.listAll(page, limit);
        return paginate(res, r.items, r.total, r.page, r.limit);
      } catch (err) { next(err); }
    },
  ];

  refund = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    validate(refundSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await paymentService.refund(req.user!.userId, req.body));
      } catch (err) { next(err); }
    },
  ];

  stats = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (_req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await paymentService.stats()); }
      catch (err) { next(err); }
    },
  ];
}

export const paymentController = new PaymentController();
