import { Types, FilterQuery } from 'mongoose';
import { ICart, CartModel } from '../models/cart.model';

export class CartRepository {
  async create(data: Partial<ICart>): Promise<ICart> {
    return CartModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<ICart | null> {
    return CartModel.findById(id);
  }

  async findByUser(userId: string | Types.ObjectId): Promise<ICart | null> {
    return CartModel.findOne({ userId, isConverted: false });
  }

  async findByGuest(guestId: string): Promise<ICart | null> {
    return CartModel.findOne({ guestId, isConverted: false });
  }

  async findAbandoned(olderThanMinutes: number, limit = 100): Promise<ICart[]> {
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
    return CartModel.find({
      isConverted: false,
      items: { $ne: [] },
      lastActivityAt: { $lt: cutoff },
      abandonedReminderSentAt: { $exists: false },
    }).limit(limit);
  }

  async update(id: string | Types.ObjectId, patch: Partial<ICart>): Promise<ICart | null> {
    return CartModel.findByIdAndUpdate(id, { $set: patch }, { new: true });
  }

  async markReminderSent(id: string | Types.ObjectId): Promise<void> {
    await CartModel.findByIdAndUpdate(id, { $set: { abandonedReminderSentAt: new Date() } });
  }

  async markConverted(id: string | Types.ObjectId, orderId: string): Promise<void> {
    await CartModel.findByIdAndUpdate(id, {
      $set: { isConverted: true, convertedToOrderId: new Types.ObjectId(orderId) },
    });
  }

  async delete(id: string | Types.ObjectId): Promise<void> {
    await CartModel.findByIdAndDelete(id);
  }

  async paginate(filter: FilterQuery<ICart> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      CartModel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
      CartModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }
}
