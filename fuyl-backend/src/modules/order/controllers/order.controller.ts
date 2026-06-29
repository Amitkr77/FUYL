import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { orderService } from '../services';
import { success, created, paginate } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import { createOrderSchema, updateStatusSchema, cancelOrderSchema, createReturnSchema, updateReturnSchema } from '../validators';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { ForbiddenError } from '../../../shared/errors';

export class OrderController {
  create = [
    validate(createOrderSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return created(res, await orderService.create(req.user!.userId, req.body));
      } catch (err) { next(err); }
    },
  ];

  getById = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const order = await orderService.getById(req.params.id);
      if (req.user!.role === Roles.CUSTOMER && order.customerId.toString() !== req.user!.userId) {
        return next(new ForbiddenError('Not your order'));
      }
      return success(res, order);
    } catch (err) { next(err); }
  };

  getByOrderNumber = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const order = await orderService.getByOrderNumber(req.params.orderNumber);
      if (req.user!.role === Roles.CUSTOMER && order.customerId.toString() !== req.user!.userId) {
        return next(new ForbiddenError('Not your order'));
      }
      return success(res, order);
    } catch (err) { next(err); }
  };

  listMine = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as string | undefined;
      return success(res, await orderService.listMine(req.user!.userId, status));
    } catch (err) { next(err); }
  };

  listBySubscription = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await orderService.listBySubscription(req.params.subscriptionId));
    } catch (err) { next(err); }
  };

  cancel = [
    validate(cancelOrderSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const order = await orderService.getById(req.params.id);
        if (req.user!.role === Roles.CUSTOMER && order.customerId.toString() !== req.user!.userId) {
          return next(new ForbiddenError('Not your order'));
        }
        return success(res, await orderService.cancel(req.params.id, req.body.reason, req.user!.userId));
      } catch (err) { next(err); }
    },
  ];

  // ─── Admin ──────────────────────────────────────────────────────
  listAll = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SELLER),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const filter: Record<string, unknown> = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.customerId) filter.customerId = req.query.customerId;
        if (req.user!.role === Roles.SELLER) filter.sellerIds = req.user!.userId;
        const result = await orderService.listAll(page, limit, filter);
        return paginate(res, result.items, result.total, result.page, result.limit);
      } catch (err) { next(err); }
    },
  ];

  updateStatus = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SELLER),
    validate(updateStatusSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await orderService.updateStatus(req.params.id, req.body, req.user!.userId));
      } catch (err) { next(err); }
    },
  ];

  stats = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (_req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await orderService.stats()); }
      catch (err) { next(err); }
    },
  ];

  // ─── Returns ────────────────────────────────────────────────────
  createReturn = [
    validate(createReturnSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return created(res, await orderService.createReturn(req.user!.userId, req.body)); }
      catch (err) { next(err); }
    },
  ];

  listMyReturns = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, await orderService.listMyReturns(req.user!.userId)); }
    catch (err) { next(err); }
  };

  listAllReturns = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const r = await orderService.listAllReturns(page, limit);
        return paginate(res, r.items, r.total, r.page, r.limit);
      } catch (err) { next(err); }
    },
  ];

  updateReturn = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    validate(updateReturnSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await orderService.updateReturn(req.params.id, req.body, req.user!.userId)); }
      catch (err) { next(err); }
    },
  ];

  // ─── Invoices ───────────────────────────────────────────────────
  listInvoicesByOrder = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, await orderService.listInvoicesByOrder(req.params.id)); }
    catch (err) { next(err); }
  };

  getInvoice = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, await orderService.getInvoice(req.params.id)); }
    catch (err) { next(err); }
  };

  generateInvoice = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return created(res, await orderService.generateInvoice(req.params.id)); }
      catch (err) { next(err); }
    },
  ];
}

export const orderController = new OrderController();
