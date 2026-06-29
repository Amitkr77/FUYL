import { FilterQuery, Types } from 'mongoose';
import { IVariant, VariantModel } from '../models/variant.model';

export class VariantRepository {
  async create(data: Partial<IVariant>): Promise<IVariant> {
    return VariantModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<IVariant | null> {
    return VariantModel.findById(id);
  }

  async findBySku(sku: string): Promise<IVariant | null> {
    return VariantModel.findOne({ sku: sku.toUpperCase() });
  }

  async findByProduct(productId: string | Types.ObjectId): Promise<IVariant[]> {
    return VariantModel.find({ productId, isActive: true }).sort({ createdAt: 1 });
  }

  async update(id: string | Types.ObjectId, patch: Partial<IVariant>): Promise<IVariant | null> {
    return VariantModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true });
  }

  async deactivate(id: string | Types.ObjectId): Promise<void> {
    await VariantModel.findByIdAndUpdate(id, { $set: { isActive: false } });
  }

  async paginate(filter: FilterQuery<IVariant> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      VariantModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      VariantModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  /**
   * Get the current sell price for a variant — falls back to product price if variant not found.
   */
  async getEffectivePrice(variantId: string | Types.ObjectId): Promise<{ price: number; currency: string; source: 'variant' } | null> {
    const v = await VariantModel.findById(variantId).select('price salePrice currency');
    if (!v) return null;
    return {
      price: (v.salePrice && v.salePrice > 0) ? v.salePrice : v.price,
      currency: v.currency,
      source: 'variant',
    };
  }
}
