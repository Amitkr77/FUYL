import { Types } from 'mongoose';
import { IInventoryStock, InventoryStockModel } from '../models/stock.model';

export class InventoryStockRepository {
  async findOrCreate(
    productId: string | Types.ObjectId,
    sellerId: string | Types.ObjectId,
    variantId?: string | Types.ObjectId,
    warehouseId = 'default'
  ): Promise<IInventoryStock> {
    const filter: Record<string, unknown> = {
      productId: new Types.ObjectId(productId.toString()),
      sellerId: new Types.ObjectId(sellerId.toString()),
      warehouseId,
    };
    if (variantId) filter.variantId = new Types.ObjectId(variantId.toString());
    else filter.variantId = { $exists: false };

    const existing = await InventoryStockModel.findOne(filter);
    if (existing) return existing;
    return InventoryStockModel.create({
      productId: new Types.ObjectId(productId.toString()),
      variantId: variantId ? new Types.ObjectId(variantId.toString()) : undefined,
      sellerId: new Types.ObjectId(sellerId.toString()),
      warehouseId,
      onHand: 0,
      reserved: 0,
      available: 0,
      reorderThreshold: 0,
      reorderQuantity: 0,
    });
  }

  async findByProduct(productId: string | Types.ObjectId, variantId?: string | Types.ObjectId) {
    const filter: Record<string, unknown> = { productId: new Types.ObjectId(productId.toString()) };
    if (variantId) filter.variantId = new Types.ObjectId(variantId.toString());
    return InventoryStockModel.find(filter);
  }

  async findBySeller(sellerId: string | Types.ObjectId, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      InventoryStockModel.find({ sellerId: new Types.ObjectId(sellerId.toString()) })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      InventoryStockModel.countDocuments({ sellerId: new Types.ObjectId(sellerId.toString()) }),
    ]);
    return { items, total, page, limit };
  }

  async findAll(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      InventoryStockModel.find({}).sort({ updatedAt: -1 }).skip(skip).limit(limit),
      InventoryStockModel.countDocuments({}),
    ]);
    return { items, total, page, limit };
  }

  async findLowStock(limit = 100) {
    return InventoryStockModel.find({
      $expr: { $lte: ['$available', '$reorderThreshold'] },
      reorderThreshold: { $gt: 0 },
    }).limit(limit);
  }

  async update(
    id: string | Types.ObjectId,
    patch: Partial<IInventoryStock>
  ): Promise<IInventoryStock | null> {
    return InventoryStockModel.findByIdAndUpdate(id, { $set: patch }, { new: true });
  }

  /**
   * Atomically apply a delta to onHand and recompute available.
   * Returns the updated stock or null if it would go negative.
   *
   * BUG FIXED (found in the fixing/testing pass, same class of issue as the
   * wallet applyDelta bug): previously this did findById() -> mutate in JS ->
   * save(). Two concurrent adjustStock() calls (e.g. two admins, or a return
   * + a sale racing) could both read the same onHand, compute conflicting
   * new values, and the second save() would silently clobber the first's
   * update — a classic lost-update race. Replaced with a single atomic
   * findOneAndUpdate() using $expr in the filter to both enforce the
   * non-negative invariant and compute the new value server-side, so
   * concurrent calls serialize correctly at the MongoDB document level.
   */
  async applyOnHandDelta(
    stockId: string | Types.ObjectId,
    delta: number
  ): Promise<IInventoryStock | null> {
    return InventoryStockModel.findOneAndUpdate(
      {
        _id: stockId,
        $expr: { $gte: [{ $add: ['$onHand', delta] }, 0] },
      },
      { $inc: { onHand: delta, available: delta } },
      { new: true }
    );
  }

  async applyReserveDelta(
    stockId: string | Types.ObjectId,
    delta: number
  ): Promise<IInventoryStock | null> {
    return InventoryStockModel.findOneAndUpdate(
      {
        _id: stockId,
        $expr: {
          $and: [
            { $gte: [{ $add: ['$reserved', delta] }, 0] },
            { $lte: [{ $add: ['$reserved', delta] }, '$onHand'] },
          ],
        },
      },
      { $inc: { reserved: delta, available: -delta } },
      { new: true }
    );
  }
}
