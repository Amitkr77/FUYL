import { InventoryStockRepository } from '../repositories/stock.repository';
import { StockMovementRepository } from '../repositories/movement.repository';
import { StockReservationRepository } from '../repositories/reservation.repository';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
} from '../../../shared/errors';
import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { queueService } from '../../../shared/services/queue.service';
import { logger } from '../../../config/logger';
import { Types } from 'mongoose';
import {
  StockAdjustmentDTO,
  SetReorderDTO,
  ReserveStockDTO,
  ReleaseReservationDTO,
} from '../validators';

const stockRepo = new InventoryStockRepository();
const movementRepo = new StockMovementRepository();
const reservationRepo = new StockReservationRepository();

class InventoryService {
  // ─── Stock queries ────────────────────────────────────────────
  async getStock(productId: string, variantId?: string) {
    const stocks = await stockRepo.findByProduct(productId, variantId);
    return stocks;
  }

  async listBySeller(sellerId: string, page = 1, limit = 50) {
    return stockRepo.findBySeller(sellerId, page, limit);
  }

  /**
   * Admin-only: stock across every seller, with product name/sku attached
   * so the admin UI doesn't need an N+1 lookup per row. No endpoint existed
   * before this — /inventory/mine required a specific sellerId, so an admin
   * had no way to see stock across the whole catalog in one call.
   */
  async listAllForAdmin(page = 1, limit = 50) {
    const result = await stockRepo.findAll(page, limit);
    const { ProductModel } = await import('../../catalog/models/product.model');
    const productIds = [...new Set(result.items.map((s) => s.productId.toString()))];
    const products = await ProductModel.find({ _id: { $in: productIds } }, { name: 1 });
    const nameById = new Map(products.map((p) => [p._id.toString(), p.name]));
    return {
      ...result,
      items: result.items.map((s) => ({
        ...s.toObject(),
        productName: nameById.get(s.productId.toString()) ?? 'Unknown product',
      })),
    };
  }

  async listLowStock(limit = 100) {
    return stockRepo.findLowStock(limit);
  }

  // ─── Stock adjustments ───────────────────────────────────────
  async adjustStock(dto: StockAdjustmentDTO, performedBy?: string) {
    // BUG FIXED (found live — reported as "set stock to 100, checkout says
    // out of stock"): this used to trust dto.sellerId as-is, which the admin
    // client sources from whichever admin is currently logged in — not
    // necessarily the product's actual owner. InventoryStock's unique index
    // is {productId, variantId, warehouseId} only (no sellerId), so a stock
    // row already exists for that combination once ANY admin has touched
    // it. Checkout always resolves sellerId from the product's own
    // `sellerId` field (catalog.service.ts's checkout path), so a second
    // admin adjusting stock under their own userId would look for a row
    // under the wrong sellerId, find nothing, and collide with the unique
    // index trying to create one — surfacing as a raw duplicate-key error
    // that reserveStock's catch-all mislabels "out of stock". Resolving
    // sellerId from the product itself, authoritatively, closes that gap
    // regardless of which admin performs the adjustment.
    const { catalogService } = await import('../../catalog/services/catalog.service');
    const product = await catalogService.getProduct(dto.productId);
    const sellerId = product.sellerId.toString();

    const stock = await stockRepo.findOrCreate(dto.productId, sellerId, dto.variantId, dto.warehouseId);
    const balanceBefore = stock.onHand;

    const updated = await stockRepo.applyOnHandDelta(stock._id, dto.delta);
    if (!updated) {
      throw new BadRequestError('Insufficient stock for adjustment');
    }

    // Record movement
    const movementType = dto.delta >= 0
      ? (dto.type === 'damage' ? 'damage' : dto.type)
      : (dto.type === 'damage' ? 'damage' : dto.type);

    await movementRepo.create({
      productId: new Types.ObjectId(dto.productId),
      variantId: dto.variantId ? new Types.ObjectId(dto.variantId) : undefined,
      sellerId: new Types.ObjectId(sellerId),
      warehouseId: dto.warehouseId,
      type: movementType as any,
      quantity: dto.delta,
      balanceBefore,
      balanceAfter: updated.onHand,
      referenceType: dto.referenceType,
      referenceId: dto.referenceId ? new Types.ObjectId(dto.referenceId) : undefined,
      unitCost: dto.unitCost,
      currency: 'INR',
      note: dto.note,
      performedBy: performedBy ? new Types.ObjectId(performedBy) : undefined,
    });

    // Update last cost if provided
    if (dto.unitCost !== undefined) {
      await stockRepo.update(stock._id, {
        lastCost: dto.unitCost,
        averageCost: updated.averageCost
          ? Math.round(((updated.averageCost * balanceBefore) + (dto.unitCost * dto.delta)) / (balanceBefore + dto.delta) * 100) / 100
          : dto.unitCost,
      });
    }

    // Check low-stock alert
    if (updated.available <= updated.reorderThreshold && updated.reorderThreshold > 0) {
      logger.warn(`[inventory] low stock: ${dto.productId} (avail=${updated.available}, threshold=${updated.reorderThreshold})`);
      // Could publish a low-stock event here
    }

    return updated;
  }

  async setReorderLevels(productId: string, _sellerId: string, dto: SetReorderDTO, variantId?: string) {
    // Same fix as adjustStock — resolve sellerId from the product itself
    // rather than the caller-supplied value, so this can never key a stock
    // row differently than checkout's reserveStock will look it up under.
    const { catalogService } = await import('../../catalog/services/catalog.service');
    const product = await catalogService.getProduct(productId);
    const stock = await stockRepo.findOrCreate(productId, product.sellerId.toString(), variantId);
    return stockRepo.update(stock._id, {
      reorderThreshold: dto.reorderThreshold,
      reorderQuantity: dto.reorderQuantity,
    });
  }

  // ─── Reservations ─────────────────────────────────────────────
  async reserveStock(dto: ReserveStockDTO): Promise<{
    reserved: Array<{ productId: string; variantId?: string; quantity: number }>;
    failed: Array<{ productId: string; variantId?: string; quantity: number; reason: string }>;
  }> {
    const reserved: Array<{ productId: string; variantId?: string; quantity: number }> = [];
    const failed: Array<{ productId: string; variantId?: string; quantity: number; reason: string }> = [];
    const expiresAt = new Date(Date.now() + dto.ttlMinutes * 60 * 1000);

    for (const item of dto.items) {
      try {
        const stock = await stockRepo.findOrCreate(item.productId, item.sellerId, item.variantId);
        if (stock.available < item.quantity) {
          failed.push({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            reason: `Only ${stock.available} available`,
          });
          continue;
        }

        const updated = await stockRepo.applyReserveDelta(stock._id, item.quantity);
        if (!updated) {
          failed.push({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
            reason: 'Reserve failed',
          });
          continue;
        }

        // Record movement + reservation
        await movementRepo.create({
          productId: new Types.ObjectId(item.productId),
          variantId: item.variantId ? new Types.ObjectId(item.variantId) : undefined,
          sellerId: new Types.ObjectId(item.sellerId),
          type: 'reservation',
          quantity: item.quantity,
          balanceBefore: stock.onHand,
          balanceAfter: updated.onHand,
          referenceType: dto.cartId ? 'cart' : 'order',
          referenceId: dto.cartId ? new Types.ObjectId(dto.cartId) : (dto.orderId ? new Types.ObjectId(dto.orderId) : undefined),
        });

        await reservationRepo.create({
          productId: new Types.ObjectId(item.productId),
          variantId: item.variantId ? new Types.ObjectId(item.variantId) : undefined,
          sellerId: new Types.ObjectId(item.sellerId),
          cartId: dto.cartId ? new Types.ObjectId(dto.cartId) : undefined,
          orderId: dto.orderId ? new Types.ObjectId(dto.orderId) : undefined,
          userId: dto.userId ? new Types.ObjectId(dto.userId) : undefined,
          quantity: item.quantity,
          status: 'active',
          expiresAt,
        });

        reserved.push({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        });
      } catch (err: any) {
        failed.push({
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          reason: err?.message ?? 'Unknown error',
        });
      }
    }

    logger.info(`[inventory] reserved ${reserved.length} items, ${failed.length} failed`);
    return { reserved, failed };
  }

  async releaseReservations(dto: ReleaseReservationDTO): Promise<void> {
    if (!dto.cartId && !dto.orderId) {
      throw new BadRequestError('Either cartId or orderId required');
    }

    let reservations;
    if (dto.cartId) {
      reservations = await reservationRepo.releaseByCart(dto.cartId);
    } else {
      // Only reservations still 'active' need releasing — ones already fulfilled,
      // released, or expired must not have their stock restored a second time.
      const all = await reservationRepo.findByOrder(dto.orderId!);
      reservations = all.filter((r) => r.status === 'active');
      for (const r of reservations) {
        await reservationRepo.markReleased(r._id);
      }
    }

    // Restore reserved quantities on stock
    for (const r of reservations) {
      const stock = await stockRepo.findOrCreate(
        r.productId,
        r.sellerId,
        r.variantId,
        r.warehouseId
      );
      await stockRepo.applyReserveDelta(stock._id, -r.quantity);
      await movementRepo.create({
        productId: r.productId,
        variantId: r.variantId,
        sellerId: r.sellerId,
        warehouseId: r.warehouseId,
        type: 'release',
        quantity: -r.quantity,
        balanceBefore: stock.onHand,
        balanceAfter: stock.onHand,
        referenceType: dto.cartId ? 'cart' : 'order',
        referenceId: dto.cartId ? new Types.ObjectId(dto.cartId) : new Types.ObjectId(dto.orderId!),
        note: 'Reservation released',
      });
    }
    logger.info(`[inventory] released ${reservations.length} reservations`);
  }

  /**
   * When an order ships, convert reservation → permanent deduction from onHand.
   */
  async fulfillOrder(orderId: string): Promise<void> {
    const reservations = await reservationRepo.fulfillByOrder(orderId);
    for (const r of reservations) {
      const stock = await stockRepo.findOrCreate(r.productId, r.sellerId, r.variantId, r.warehouseId);
      // Reduce reserved + onHand (this is the "ship out" effect)
      const updated = await stockRepo.applyReserveDelta(stock._id, -r.quantity);
      if (updated) {
        const updated2 = await stockRepo.applyOnHandDelta(stock._id, -r.quantity);
        if (updated2) {
          await movementRepo.create({
            productId: r.productId,
            variantId: r.variantId,
            sellerId: r.sellerId,
            warehouseId: r.warehouseId,
            type: 'order_out',
            quantity: -r.quantity,
            balanceBefore: stock.onHand,
            balanceAfter: updated2.onHand,
            referenceType: 'order',
            referenceId: new Types.ObjectId(orderId),
            note: `Order ${orderId} shipped`,
          });
        }
      }
    }
    logger.info(`[inventory] fulfilled order ${orderId} (${reservations.length} reservations)`);
  }

  // ─── Movement history ─────────────────────────────────────────
  async listMovements(filter: Record<string, unknown> = {}, page = 1, limit = 50) {
    return movementRepo.paginate(filter, page, limit);
  }

  /**
   * Scheduled job: expire stale reservations.
   */
  async expireStaleReservations(): Promise<number> {
    const expired = await reservationRepo.findExpired();
    let n = 0;
    for (const r of expired) {
      try {
        await reservationRepo.markExpired(r._id);
        const stock = await stockRepo.findOrCreate(r.productId, r.sellerId, r.variantId, r.warehouseId);
        await stockRepo.applyReserveDelta(stock._id, -r.quantity);
        n++;
      } catch (err) {
        logger.error(`[inventory] failed to expire reservation ${r._id}`, err);
      }
    }
    if (n > 0) logger.info(`[inventory] expired ${n} stale reservations`);
    return n;
  }
}

export const inventoryService = new InventoryService();
