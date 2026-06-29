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
   */
  async applyOnHandDelta(
    stockId: string | Types.ObjectId,
    delta: number
  ): Promise<IInventoryStock | null> {
    const stock = await InventoryStockModel.findById(stockId);
    if (!stock) return null;
    const newOnHand = stock.onHand + delta;
    if (newOnHand < 0) return null;
    stock.onHand = newOnHand;
    stock.available = newOnHand - stock.reserved;
    return stock.save();
  }

  async applyReserveDelta(
    stockId: string | Types.ObjectId,
    delta: number
  ): Promise<IInventoryStock | null> {
    const stock = await InventoryStockModel.findById(stockId);
    if (!stock) return null;
    const newReserved = stock.reserved + delta;
    if (newReserved < 0) return null;
    if (newReserved > stock.onHand) return null; // can't reserve more than onHand
    stock.reserved = newReserved;
    stock.available = stock.onHand - newReserved;
    return stock.save();
  }
}
