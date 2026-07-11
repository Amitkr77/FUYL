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

  // Finds an active variant of this product with the exact same attribute
  // combination (e.g. {size:'500g', flavor:'spicy'}) — used to reject
  // duplicate variants before they're created/renamed into a collision.
  // excludeId lets an update check against every *other* variant.
  async findByProductAndAttributes(
    productId: string | Types.ObjectId,
    attributes: Record<string, string | number | boolean>,
    excludeId?: string | Types.ObjectId
  ): Promise<IVariant | null> {
    const attrFilter = Object.fromEntries(
      Object.entries(attributes).map(([k, v]) => [`attributes.${k}`, v])
    );
    return VariantModel.findOne({
      productId,
      isActive: true,
      ...attrFilter,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    });
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
