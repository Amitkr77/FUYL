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

  async listLowStock(limit = 100) {
    return stockRepo.findLowStock(limit);
  }

  // ─── Stock adjustments ───────────────────────────────────────
  async adjustStock(dto: StockAdjustmentDTO, performedBy?: string) {
    const stock = await stockRepo.findOrCreate(dto.productId, dto.sellerId, dto.variantId, dto.warehouseId);
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
      sellerId: new Types.ObjectId(dto.sellerId),
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
    const stock = await stockRepo.findOrCreate(productId, sellerId, variantId);
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
      // For order, mark as released (only those that haven't been fulfilled)
      reservations = await reservationRepo.findByOrder(dto.orderId!);
      for (const r of reservations) {
        if (r.status === 'active') {
          await reservationRepo.markReleased(r._id);
        }
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
