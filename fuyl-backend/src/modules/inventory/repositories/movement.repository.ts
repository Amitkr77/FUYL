import { Types } from 'mongoose';
import { IStockMovement, StockMovementModel } from '../models/movement.model';

export class StockMovementRepository {
  async create(data: Partial<IStockMovement>): Promise<IStockMovement> {
    return StockMovementModel.create(data);
  }

  async findByProduct(productId: string | Types.ObjectId, limit = 100) {
    return StockMovementModel
      .find({ productId: new Types.ObjectId(productId.toString()) })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async findByReference(referenceType: string, referenceId: string | Types.ObjectId) {
    return StockMovementModel.find({
      referenceType,
      referenceId: new Types.ObjectId(referenceId.toString()),
    }).sort({ createdAt: -1 });
  }

  async findBySeller(sellerId: string | Types.ObjectId, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      StockMovementModel
        .find({ sellerId: new Types.ObjectId(sellerId.toString()) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      StockMovementModel.countDocuments({ sellerId: new Types.ObjectId(sellerId.toString()) }),
    ]);
    return { items, total, page, limit };
  }

  async paginate(filter: Record<string, unknown> = {}, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      StockMovementModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      StockMovementModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }
}
