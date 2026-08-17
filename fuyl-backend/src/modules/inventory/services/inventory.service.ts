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
import mongoose, { Types } from 'mongoose';
import { InventoryStockModel, StockMovementModel, StockReservationModel } from '../models';
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
    const { VariantModel } = await import('../../catalog/models/variant.model');

    const productIds = [...new Set(result.items.map((s) => s.productId.toString()))];
    const [products, variants] = await Promise.all([
      // Match the admin Products page: drafts and active products are visible,
      // while archived (soft-deleted) and missing products are not.
      ProductModel.find(
        { _id: { $in: productIds }, isDeleted: false },
        { name: 1 },
      ),
      productIds.length > 0
        ? VariantModel.find(
            { productId: { $in: productIds }, isActive: true },
            { productId: 1, name: 1, sku: 1 },
          )
        : Promise.resolve([]),
    ]);

    const nameById    = new Map(products.map((p) => [p._id.toString(), p.name]));
    const visibleProductIds = new Set(nameById.keys());
    const variantById = new Map(variants.map((v) => [v._id.toString(), { name: v.name, sku: v.sku }]));
    const productsWithVariants = new Set(variants.map((v) => v.productId.toString()));

    // A product has exactly one inventory mode. Legacy product-level rows may
    // remain after variants are added, but exposing those alongside the real
    // variants creates a misleading third "default" variant in the admin UI.
    const visibleItems = result.items.filter((stock) => {
      const productId = stock.productId.toString();
      if (!visibleProductIds.has(productId)) return false;
      if (!stock.variantId) return !productsWithVariants.has(productId);
      return variantById.has(stock.variantId.toString());
    });

    return {
      ...result,
      items: visibleItems.map((s) => {
        const variant = s.variantId ? variantById.get(s.variantId.toString()) : undefined;
        return {
          ...s.toObject(),
          productName: nameById.get(s.productId.toString()) ?? 'Unknown product',
          variantName: variant?.name ?? null,
          variantSku:  variant?.sku  ?? null,
        };
      }),
    };
  }

  async listLowStock(limit = 100) {
    return stockRepo.findLowStock(limit);
  }

  // ─── Stock adjustments ───────────────────────────────────────
  async adjustStock(dto: StockAdjustmentDTO, performedBy?: string) {
    // Seller ownership belongs to inventory, not the product catalog. The
    // authenticated admin client supplies the inventory owner when creating
    // the first stock record; existing records retain that owner.
    const existingStocks = await stockRepo.findByProduct(dto.productId, dto.variantId);
    const existingStock = existingStocks.find((row) =>
      row.warehouseId === (dto.warehouseId ?? 'default')
      && (dto.variantId ? row.variantId?.toString() === dto.variantId : !row.variantId),
    );
    const sellerId = existingStock?.sellerId.toString() ?? dto.sellerId;

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

  async setReorderLevels(productId: string, sellerId: string, dto: SetReorderDTO, variantId?: string) {
    const existingStocks = await stockRepo.findByProduct(productId, variantId);
    const existingStock = existingStocks.find((row) => variantId
      ? row.variantId?.toString() === variantId
      : !row.variantId,
    );
    const stock = await stockRepo.findOrCreate(
      productId,
      existingStock?.sellerId.toString() ?? sellerId,
      variantId,
    );
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
    const referenceType = dto.cartId ? 'cart' : 'order';
    const referenceId = dto.cartId ?? dto.orderId;
    if (!referenceId) throw new BadRequestError('Either cartId or orderId required');

    for (const item of dto.items) {
      const idempotencyKey = `${referenceType}:${referenceId}:${item.productId}:${item.variantId ?? 'default'}:${item.sellerId}:default`;
      const session = await mongoose.startSession();
      try {
        let reservationApplied = false;
        await session.withTransaction(async () => {
          const duplicate = await StockReservationModel.findOne({ idempotencyKey }).session(session);
          if (duplicate) {
            if (duplicate.quantity !== item.quantity || duplicate.status !== 'active') {
              throw new ConflictError('An existing reservation for this cart no longer matches the requested quantity');
            }
            reservationApplied = true;
            return;
          }

          const stock = await InventoryStockModel.findOneAndUpdate(
            {
              productId: new Types.ObjectId(item.productId),
              variantId: item.variantId ? new Types.ObjectId(item.variantId) : { $exists: false },
              sellerId: new Types.ObjectId(item.sellerId),
              warehouseId: 'default',
              available: { $gte: item.quantity },
            },
            { $inc: { reserved: item.quantity, available: -item.quantity } },
            { new: false, session }
          );
          if (!stock) throw new ConflictError('Insufficient available stock');

          await StockReservationModel.create([{
            productId: new Types.ObjectId(item.productId),
            variantId: item.variantId ? new Types.ObjectId(item.variantId) : undefined,
            sellerId: new Types.ObjectId(item.sellerId),
            cartId: dto.cartId ? new Types.ObjectId(dto.cartId) : undefined,
            orderId: dto.orderId ? new Types.ObjectId(dto.orderId) : undefined,
            userId: dto.userId ? new Types.ObjectId(dto.userId) : undefined,
            quantity: item.quantity,
            status: 'active',
            expiresAt,
            idempotencyKey,
          }], { session });

          await StockMovementModel.create([{
            productId: new Types.ObjectId(item.productId),
            variantId: item.variantId ? new Types.ObjectId(item.variantId) : undefined,
            sellerId: new Types.ObjectId(item.sellerId),
            warehouseId: 'default',
            type: 'reservation',
            quantity: item.quantity,
            balanceBefore: stock.onHand,
            balanceAfter: stock.onHand,
            referenceType,
            referenceId: new Types.ObjectId(referenceId),
          }], { session });
          reservationApplied = true;
        });
        if (reservationApplied) reserved.push({ productId: item.productId, variantId: item.variantId, quantity: item.quantity });
      } catch (error: any) {
        if (error?.code === 11000 && await StockReservationModel.exists({ idempotencyKey })) {
          reserved.push({ productId: item.productId, variantId: item.variantId, quantity: item.quantity });
        } else {
          failed.push({ productId: item.productId, variantId: item.variantId, quantity: item.quantity, reason: error?.message ?? 'Reserve failed' });
        }
      } finally {
        await session.endSession();
      }
    }

    logger.info(`[inventory] reserved ${reserved.length} items, ${failed.length} failed`);
    return { reserved, failed };
  }

  private async reserveStockLegacy(dto: ReserveStockDTO): Promise<{
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
    if (!dto.cartId && !dto.orderId) throw new BadRequestError('Either cartId or orderId required');
    const referenceType = dto.cartId ? 'cart' : 'order';
    const referenceId = dto.cartId ?? dto.orderId!;
    const session = await mongoose.startSession();
    let releasedCount = 0;
    try {
      await session.withTransaction(async () => {
        const filter = dto.cartId
          ? { cartId: new Types.ObjectId(dto.cartId), status: 'active' }
          : { orderId: new Types.ObjectId(dto.orderId!), status: 'active' };
        const reservations = await StockReservationModel.find(filter).session(session);
        for (const reservation of reservations) {
          const claim = await StockReservationModel.updateOne(
            { _id: reservation._id, status: 'active' },
            { $set: { status: 'released', releasedAt: new Date() } },
            { session }
          );
          if (claim.modifiedCount !== 1) continue;

          const stock = await InventoryStockModel.findOneAndUpdate(
            {
              productId: reservation.productId,
              variantId: reservation.variantId ?? { $exists: false },
              sellerId: reservation.sellerId,
              warehouseId: reservation.warehouseId ?? 'default',
              reserved: { $gte: reservation.quantity },
            },
            { $inc: { reserved: -reservation.quantity, available: reservation.quantity } },
            { new: false, session }
          );
          if (!stock) throw new ConflictError(`Reserved stock is inconsistent for reservation ${reservation._id}`);
          await StockMovementModel.create([{
            productId: reservation.productId,
            variantId: reservation.variantId,
            sellerId: reservation.sellerId,
            warehouseId: reservation.warehouseId,
            type: 'release',
            quantity: -reservation.quantity,
            balanceBefore: stock.onHand,
            balanceAfter: stock.onHand,
            referenceType,
            referenceId: new Types.ObjectId(referenceId),
            note: 'Reservation released',
          }], { session });
          releasedCount += 1;
        }
      });
    } finally {
      await session.endSession();
    }
    logger.info(`[inventory] released ${releasedCount} reservations`);
  }

  async attachReservationsToOrder(cartId: string, orderId: string): Promise<number> {
    const result = await StockReservationModel.updateMany(
      {
        cartId: new Types.ObjectId(cartId),
        status: 'active',
        $or: [{ orderId: { $exists: false } }, { orderId: new Types.ObjectId(orderId) }],
      },
      { $set: { orderId: new Types.ObjectId(orderId) } }
    );
    if (result.matchedCount === 0) {
      throw new ConflictError(`No active inventory reservations found for cart ${cartId}`);
    }
    return result.modifiedCount;
  }

  private async releaseReservationsLegacy(dto: ReleaseReservationDTO): Promise<void> {
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
  async fulfillOrder(orderId: string, orderNumber?: string): Promise<void> {
    const session = await mongoose.startSession();
    let fulfilledCount = 0;
    try {
      await session.withTransaction(async () => {
        const reservations = await StockReservationModel.find({
          orderId: new Types.ObjectId(orderId),
          status: 'active',
        }).session(session);

        for (const reservation of reservations) {
          // Fulfilment reduces onHand and reserved by the same quantity, so
          // available remains unchanged. One guarded stock write replaces the
          // old two-write sequence that could fail halfway through.
          const stock = await InventoryStockModel.findOneAndUpdate(
            {
              productId: reservation.productId,
              variantId: reservation.variantId ?? { $exists: false },
              sellerId: reservation.sellerId,
              warehouseId: reservation.warehouseId ?? 'default',
              reserved: { $gte: reservation.quantity },
              onHand: { $gte: reservation.quantity },
            },
            { $inc: { reserved: -reservation.quantity, onHand: -reservation.quantity } },
            { new: false, session }
          );
          if (!stock) {
            throw new ConflictError(`Inventory changed before order ${orderNumber ?? orderId} could be fulfilled`);
          }

          const reservationClaim = await StockReservationModel.updateOne(
            { _id: reservation._id, status: 'active' },
            { $set: { status: 'fulfilled', fulfilledAt: new Date() } },
            { session }
          );
          if (reservationClaim.modifiedCount !== 1) {
            throw new ConflictError(`Reservation was already processed for order ${orderNumber ?? orderId}`);
          }

          await StockMovementModel.create([{
            productId: reservation.productId,
            variantId: reservation.variantId,
            sellerId: reservation.sellerId,
            warehouseId: reservation.warehouseId,
            type: 'order_out',
            quantity: -reservation.quantity,
            balanceBefore: stock.onHand,
            balanceAfter: stock.onHand - reservation.quantity,
            referenceType: 'order',
            referenceId: new Types.ObjectId(orderId),
            note: `Order ${orderNumber ?? 'shipment'} shipped`,
          }], { session });
          fulfilledCount += 1;
        }
      });
    } finally {
      await session.endSession();
    }
    logger.info(`[inventory] fulfilled order ${orderId} (${fulfilledCount} reservations)`);
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
    let count = 0;
    for (const candidate of expired) {
      const session = await mongoose.startSession();
      try {
        let didExpire = false;
        await session.withTransaction(async () => {
          const reservation = await StockReservationModel.findOneAndUpdate(
            { _id: candidate._id, status: 'active', orderId: { $exists: false }, expiresAt: { $lte: new Date() } },
            { $set: { status: 'expired', releasedAt: new Date() } },
            { new: true, session }
          );
          if (!reservation) return;
          const stock = await InventoryStockModel.findOneAndUpdate(
            {
              productId: reservation.productId,
              variantId: reservation.variantId ?? { $exists: false },
              sellerId: reservation.sellerId,
              warehouseId: reservation.warehouseId ?? 'default',
              reserved: { $gte: reservation.quantity },
            },
            { $inc: { reserved: -reservation.quantity, available: reservation.quantity } },
            { new: false, session }
          );
          if (!stock) throw new ConflictError(`Reserved stock is inconsistent for reservation ${reservation._id}`);
          await StockMovementModel.create([{
            productId: reservation.productId,
            variantId: reservation.variantId,
            sellerId: reservation.sellerId,
            warehouseId: reservation.warehouseId,
            type: 'release',
            quantity: -reservation.quantity,
            balanceBefore: stock.onHand,
            balanceAfter: stock.onHand,
            referenceType: 'reservation',
            referenceId: reservation._id,
            note: 'Reservation expired',
          }], { session });
          didExpire = true;
        });
        if (didExpire) count += 1;
      } catch (error) {
        logger.error(`[inventory] failed to expire reservation ${candidate._id}`, error);
      } finally {
        await session.endSession();
      }
    }
    if (count > 0) logger.info(`[inventory] expired ${count} stale reservations`);
    return count;
  }

  private async expireStaleReservationsLegacy(): Promise<number> {
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
