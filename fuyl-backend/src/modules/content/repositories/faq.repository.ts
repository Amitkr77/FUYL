import { FilterQuery, Types } from 'mongoose';
import { IFAQ, FAQModel } from '../models/faq.model';

export class FAQRepository {
  async create(data: Partial<IFAQ>): Promise<IFAQ> {
    return FAQModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<IFAQ | null> {
    return FAQModel.findById(id);
  }

  async update(id: string | Types.ObjectId, patch: Partial<IFAQ>): Promise<IFAQ | null> {
    return FAQModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true });
  }

  async delete(id: string | Types.ObjectId): Promise<void> {
    await FAQModel.findByIdAndDelete(id);
  }

  async list(filter: FilterQuery<IFAQ> = {}) {
    return FAQModel.find(filter).sort({ order: 1, createdAt: 1 });
  }

  async paginate(filter: FilterQuery<IFAQ> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      FAQModel.find(filter).sort({ order: 1, createdAt: 1 }).skip(skip).limit(limit),
      FAQModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }
}
