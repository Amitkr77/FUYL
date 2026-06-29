import { FilterQuery, Types } from 'mongoose';
import { IProduct, ProductModel } from '../models/product.model';

export class ProductRepository {
  async create(data: Partial<IProduct>): Promise<IProduct> {
    return ProductModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<IProduct | null> {
    return ProductModel.findById(id);
  }

  async findBySlug(slug: string): Promise<IProduct | null> {
    return ProductModel.findOne({ 'seo.slug': slug.toLowerCase() });
  }

  async findBySku(sku: string): Promise<IProduct | null> {
    // SKU is on the variant, but a product lookup-by-sku is convenient
    const { VariantModel } = await import('../models/variant.model');
    const v = await VariantModel.findOne({ sku: sku.toUpperCase() });
    if (!v) return null;
    return ProductModel.findById(v.productId);
  }

  async update(id: string | Types.ObjectId, patch: Partial<IProduct>): Promise<IProduct | null> {
    return ProductModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true });
  }

  async softDelete(id: string | Types.ObjectId): Promise<void> {
    await ProductModel.findByIdAndUpdate(id, { $set: { isDeleted: true, isPublished: false } });
  }

  async publish(id: string | Types.ObjectId): Promise<IProduct | null> {
    return ProductModel.findByIdAndUpdate(
      id,
      { $set: { isPublished: true, publishedAt: new Date() } },
      { new: true }
    );
  }

  async unpublish(id: string | Types.ObjectId): Promise<IProduct | null> {
    return ProductModel.findByIdAndUpdate(id, { $set: { isPublished: false } }, { new: true });
  }

  async paginate(filter: FilterQuery<IProduct> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      ProductModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ProductModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async search(query: string, filter: FilterQuery<IProduct> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const finalFilter = { ...filter, $text: { $search: query } };
    const [items, total] = await Promise.all([
      ProductModel.find(finalFilter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit),
      ProductModel.countDocuments(finalFilter),
    ]);
    return { items, total, page, limit };
  }

  /**
   * Public-facing catalog filter: only published, non-deleted products.
   */
  async listPublished(filter: FilterQuery<IProduct> = {}, page = 1, limit = 20) {
    const finalFilter = { isPublished: true, isDeleted: false, ...filter };
    return this.paginate(finalFilter, page, limit);
  }

  async updateRating(productId: string | Types.ObjectId, average: number, count: number): Promise<void> {
    await ProductModel.findByIdAndUpdate(productId, { $set: { ratingAverage: average, ratingCount: count } });
  }

  /**
   * Get the current sell price for a product — sale price if set and > 0, else base price.
   */
  async getEffectivePrice(productId: string | Types.ObjectId): Promise<{ price: number; currency: string; source: 'product' } | null> {
    const p = await ProductModel.findById(productId).select('basePrice salePrice currency');
    if (!p) return null;
    return {
      price: (p.salePrice && p.salePrice > 0) ? p.salePrice : p.basePrice,
      currency: p.currency,
      source: 'product',
    };
  }
}
