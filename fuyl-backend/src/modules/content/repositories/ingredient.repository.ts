import { FilterQuery, Types } from 'mongoose';
import { IIngredient, IngredientModel } from '../models/ingredient.model';

export class IngredientRepository {
  async create(data: Partial<IIngredient>): Promise<IIngredient> {
    return IngredientModel.create(data);
  }

  async nextOrder(): Promise<number> {
    const last = await IngredientModel.findOne({}).sort({ order: -1 }).select('order').lean();
    return (last?.order ?? -1) + 1;
  }

  async setOrder(ids: string[]): Promise<void> {
    if (!ids.length) return;
    await IngredientModel.bulkWrite(ids.map((id, order) => ({ updateOne: { filter: { _id: id }, update: { $set: { order } } } })));
  }

  async findById(id: string | Types.ObjectId): Promise<IIngredient | null> {
    return IngredientModel.findById(id);
  }

  async slugExists(slug: string): Promise<boolean> {
    return (await IngredientModel.exists({ slug })) !== null;
  }

  async update(id: string | Types.ObjectId, patch: Partial<IIngredient>): Promise<IIngredient | null> {
    return IngredientModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true });
  }

  async delete(id: string | Types.ObjectId): Promise<void> {
    await IngredientModel.findByIdAndDelete(id);
  }

  async list(filter: FilterQuery<IIngredient> = {}) {
    return IngredientModel.find(filter).sort({ order: 1, createdAt: 1 });
  }

  async paginate(filter: FilterQuery<IIngredient> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      IngredientModel.find(filter).sort({ order: 1, createdAt: 1 }).skip(skip).limit(limit),
      IngredientModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }
}
