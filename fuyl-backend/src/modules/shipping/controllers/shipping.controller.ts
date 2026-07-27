import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { authorize, requirePermission, Permissions, Roles } from '../../../shared/middleware/rbac.middleware';
import { shippingService } from '../services';
import { success, paginate } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import { createShipmentSchema, updateShipmentStatusSchema } from '../validators';

export class ShippingController {
  create = [
    authorize(Roles.SELLER, Roles.ADMIN, Roles.SUPER_ADMIN),
    validate(createShipmentSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const shipment = await shippingService.createFromOrder(req.body, req.user!.userId, req.user!.role);
        return success(res, shipment, 201);
      } catch (err) { next(err); }
    },
  ];

  // Public — checkout serviceability + rate lookups.
  serviceability = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await shippingService.checkServiceability(req.params.pincode));
    } catch (err) { next(err); }
  };

  rate = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const pincode = req.query.pincode as string;
      const weightGrams = req.query.weight ? Number(req.query.weight) : undefined;
      const paymentMode = req.query.paymentMode === 'COD' ? 'COD' : 'Prepaid';
      return success(res, await shippingService.quoteRate({ pincode, weightGrams, paymentMode }));
    } catch (err) { next(err); }
  };

  getById = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await shippingService.getById(req.params.id));
    } catch (err) { next(err); }
  };

  listByOrder = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await shippingService.listByOrder(req.params.orderId));
    } catch (err) { next(err); }
  };

  listMine = [
    authorize(Roles.SELLER, Roles.ADMIN, Roles.SUPER_ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const sellerId = req.user!.role === Roles.SELLER ? req.user!.userId : (req.query.sellerId as string);
        if (!sellerId) return success(res, []);
        const page = Number(req.query.page ?? 1);
        const limit = Math.min(Number(req.query.limit ?? 20), 100);
        const result = await shippingService.listBySeller(sellerId, page, limit);
        return paginate(res, result.items, result.total, result.page, result.limit);
      } catch (err) { next(err); }
    },
  ];

  updateStatus = [
    authorize(Roles.SELLER, Roles.ADMIN, Roles.SUPER_ADMIN),
    validate(updateShipmentStatusSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const updated = await shippingService.updateStatus(req.params.id, req.body, req.user!.userId, req.user!.role);
        return success(res, updated);
      } catch (err) { next(err); }
    },
  ];

  listAllForAdmin = [
    requirePermission(Permissions.SHIPPING_MANAGE),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const page = Number(req.query.page ?? 1);
        const limit = Math.min(Number(req.query.limit ?? 20), 100);
        const filter: Record<string, unknown> = {};
        if (req.query.status) filter.status = req.query.status;
        const result = await shippingService.listAllForAdmin(filter, page, limit);
        return paginate(res, result.items, result.total, result.page, result.limit);
      } catch (err) { next(err); }
    },
  ];

  stats = [
    requirePermission(Permissions.SHIPPING_MANAGE),
    async (_req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await shippingService.statsForAdmin());
      } catch (err) { next(err); }
    },
  ];

  // Pull the latest carrier scan and advance the shipment if it moved forward.
  syncTracking = [
    requirePermission(Permissions.SHIPPING_MANAGE),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await shippingService.syncTracking(req.params.id));
      } catch (err) { next(err); }
    },
  ];

  // Re-attempt delivery for a failed (NDR) shipment.
  reattempt = [
    requirePermission(Permissions.SHIPPING_MANAGE),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await shippingService.requestReattempt(req.params.id, req.user!.userId));
      } catch (err) { next(err); }
    },
  ];

  // Shipping-label / packing-slip URL for a shipment.
  label = [
    requirePermission(Permissions.SHIPPING_MANAGE),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await shippingService.getLabelUrl(req.params.id));
      } catch (err) { next(err); }
    },
  ];
}

export const shippingController = new ShippingController();
