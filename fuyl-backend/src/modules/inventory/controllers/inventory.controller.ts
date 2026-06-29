import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { inventoryService } from '../services';
import { success, paginate } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import {
  stockAdjustmentSchema,
  setReorderSchema,
  reserveStockSchema,
  releaseReservationSchema,
} from '../validators';

export class InventoryController {
  // ─── Stock queries (any auth) ─────────────────────────────────
  getStock = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const variantId = req.query.variantId as string | undefined;
      return success(res, await inventoryService.getStock(req.params.productId, variantId));
    } catch (err) { next(err); }
  };

  listMine = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      // Sellers list their own stock; admins can pass ?sellerId=
      const sellerId = req.user?.role === Roles.SELLER
        ? req.user.userId
        : (req.query.sellerId as string);
      if (!sellerId) return success(res, []);
      const page = Number(req.query.page ?? 1);
      const limit = Math.min(Number(req.query.limit ?? 50), 200);
      const result = await inventoryService.listBySeller(sellerId, page, limit);
      return paginate(res, result.items, result.total, result.page, result.limit);
    } catch (err) { next(err); }
  };

  listLowStock = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(Number(req.query.limit ?? 100), 500);
      return success(res, await inventoryService.listLowStock(limit));
    } catch (err) { next(err); }
  };

  // ─── Stock adjustments (seller/admin) ─────────────────────────
  adjust = [
    validate(stockAdjustmentSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        // Sellers can only adjust their own stock
        if (req.user?.role === Roles.SELLER && req.body.sellerId !== req.user.userId) {
          return next(new Error('Sellers can only adjust their own stock'));
        }
        const updated = await inventoryService.adjustStock(req.body, req.user?.userId);
        return success(res, updated);
      } catch (err) { next(err); }
    },
  ];

  setReorder = [
    validate(setReorderSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const sellerId = req.user?.role === Roles.SELLER
          ? req.user.userId
          : (req.body.sellerId as string) ?? req.user!.userId;
        const variantId = req.query.variantId as string | undefined;
        const updated = await inventoryService.setReorderLevels(
          req.params.productId,
          sellerId,
          req.body,
          variantId
        );
        return success(res, updated);
      } catch (err) { next(err); }
    },
  ];

  // ─── Reservations ─────────────────────────────────────────────
  reserve = [
    validate(reserveStockSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const result = await inventoryService.reserveStock(req.body);
        return success(res, result);
      } catch (err) { next(err); }
    },
  ];

  release = [
    validate(releaseReservationSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        await inventoryService.releaseReservations(req.body);
        return success(res, { released: true });
      } catch (err) { next(err); }
    },
  ];

  // ─── Movement history (seller/admin) ──────────────────────────
  listMovements = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Math.min(Number(req.query.limit ?? 50), 200);
      const filter: Record<string, unknown> = {};
      if (req.query.productId) filter.productId = req.query.productId;
      if (req.query.sellerId) filter.sellerId = req.query.sellerId;
      if (req.query.type) filter.type = req.query.type;
      if (req.user?.role === Roles.SELLER) filter.sellerId = req.user.userId;
      const result = await inventoryService.listMovements(filter, page, limit);
      return paginate(res, result.items, result.total, result.page, result.limit);
    } catch (err) { next(err); }
  };
}

export const inventoryController = new InventoryController();
