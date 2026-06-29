import { Types } from 'mongoose';
import { IPriceBook, PriceBookModel } from '../models/priceBook.model';

export class PriceBookRepository {
  async create(data: Partial<IPriceBook>): Promise<IPriceBook> {
    return PriceBookModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<IPriceBook | null> {
    return PriceBookModel.findById(id);
  }

  async findActiveForProduct(productId: string | Types.ObjectId): Promise<IPriceBook[]> {
    const now = new Date();
    return PriceBookModel.find({
      status: 'active',
      isActive: true,
      'entries.productId': new Types.ObjectId(productId.toString()),
      $and: [
        { $or: [{ startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: { $exists: false } }, { endsAt: { $gte: now } }] },
      ],
    }).sort({ priority: -1, createdAt: -1 });
  }

  async findAll(filter: Record<string, unknown> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      PriceBookModel.find(filter).sort({ priority: -1, createdAt: -1 }).skip(skip).limit(limit),
      PriceBookModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async update(id: string, patch: Partial<IPriceBook>): Promise<IPriceBook | null> {
    return PriceBookModel.findByIdAndUpdate(id, { $set: patch }, { new: true });
  }

  async delete(id: string): Promise<void> {
    await PriceBookModel.findByIdAndDelete(id);
  }

  async activate(id: string): Promise<IPriceBook | null> {
    return PriceBookModel.findByIdAndUpdate(id, { $set: { status: 'active', isActive: true } }, { new: true });
  }

  async archive(id: string): Promise<IPriceBook | null> {
    return PriceBookModel.findByIdAndUpdate(id, { $set: { status: 'archived', isActive: false } }, { new: true });
  }
}
