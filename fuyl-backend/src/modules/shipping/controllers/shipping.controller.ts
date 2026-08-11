import { Request, Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { authorize, requirePermission, Permissions, Roles } from '../../../shared/middleware/rbac.middleware';
import { shippingService } from '../services';
import { success, paginate } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import { createShipmentSchema, updateShipmentStatusSchema } from '../validators';
import { env } from '../../../config/env';
import { UnauthorizedError } from '../../../shared/errors';
import { logger } from '../../../config/logger';

export class ShippingController {
  create = [
    authorize(Roles.ADMIN, Roles.SUPER_ADMIN),
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
    authorize(Roles.ADMIN, Roles.SUPER_ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const sellerId = req.query.sellerId as string;
        if (!sellerId) return success(res, []);
        const page = Number(req.query.page ?? 1);
        const limit = Math.min(Number(req.query.limit ?? 20), 100);
        const result = await shippingService.listBySeller(sellerId, page, limit);
        return paginate(res, result.items, result.total, result.page, result.limit);
      } catch (err) { next(err); }
    },
  ];

  updateStatus = [
    authorize(Roles.ADMIN, Roles.SUPER_ADMIN),
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

  /**
   * Public webhook receiver for Shiprocket tracking events — push-based
   * counterpart to the scheduled poll (syncTracking/syncActiveShipments).
   * No user session involved, so authenticity rests entirely on the shared
   * secret Shiprocket echoes back per request.
   *
   * ⚠️ VERIFY the header name against your Shiprocket webhook config —
   * `x-api-key` is what their panel commonly documents, but confirm it
   * matches what your account actually sends before relying on this.
   */
  shiprocketWebhook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const secret = req.headers['x-api-key'] as string | undefined;
      if (!env.shiprocket.webhookSecret || secret !== env.shiprocket.webhookSecret) {
        logger.warn('[webhook] shiprocket secret mismatch');
        return next(new UnauthorizedError('Invalid Shiprocket webhook secret'));
      }
      await shippingService.handleShiprocketWebhook(req.body ?? {});
      return res.status(200).json({ received: true });
    } catch (err) {
      logger.error('[webhook] shiprocket handler error', err);
      return res.status(500).json({ received: false });
    }
  };
}

export const shippingController = new ShippingController();
