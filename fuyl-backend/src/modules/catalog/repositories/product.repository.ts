import { FilterQuery, Types } from 'mongoose';
import { IProduct, ProductModel } from '../models/product.model';
import { ProductStatus } from '../../../shared/enums';

/** Escape regex metacharacters so search input is treated as a literal. */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * isPublished/isDeleted remain the fields every existing query filters on;
 * `status` is the admin-facing source of truth. Keep them in sync on every
 * write that touches `status` so both stay correct without rewriting queries.
 */
function deriveFlags(status: typeof ProductStatus[keyof typeof ProductStatus]) {
  return {
    isPublished: status === ProductStatus.ACTIVE,
    isDeleted: status === ProductStatus.ARCHIVED,
  };
}

export class ProductRepository {
  async create(data: Partial<IProduct>): Promise<IProduct> {
    const status = data.status ?? ProductStatus.DRAFT;
    return ProductModel.create({ ...data, status, ...deriveFlags(status) });
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
    const set = patch.status ? { ...patch, ...deriveFlags(patch.status) } : patch;
    return ProductModel.findByIdAndUpdate(id, { $set: set }, { new: true, runValidators: true });
  }

  async softDelete(id: string | Types.ObjectId): Promise<void> {
    await ProductModel.findByIdAndUpdate(id, {
      $set: { status: ProductStatus.ARCHIVED, ...deriveFlags(ProductStatus.ARCHIVED) },
    });
  }

  async publish(id: string | Types.ObjectId): Promise<IProduct | null> {
    return ProductModel.findByIdAndUpdate(
      id,
      { $set: { status: ProductStatus.ACTIVE, ...deriveFlags(ProductStatus.ACTIVE), publishedAt: new Date() } },
      { new: true }
    );
  }

  async unpublish(id: string | Types.ObjectId): Promise<IProduct | null> {
    return ProductModel.findByIdAndUpdate(
      id,
      { $set: { status: ProductStatus.DRAFT, ...deriveFlags(ProductStatus.DRAFT) } },
      { new: true }
    );
  }

  // List/search return plain objects via .lean() — these are read-only,
  // high-traffic catalog paths and never call document methods, so skipping
  // Mongoose hydration is a pure CPU/GC win with an identical response shape
  // (serializeProduct already handles plain objects).
  async paginate(filter: FilterQuery<IProduct> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      ProductModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ProductModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async search(query: string, filter: FilterQuery<IProduct> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    // Case-insensitive substring match so partial words ("ashwa", "compl")
    // hit — the `$text` index only matches whole, stemmed terms. Covers the
    // fields a shopper would actually type; `description` (long HTML) is left
    // out on purpose. Input is escaped so it can't act as a regex.
    const re = { $regex: escapeRegex(query), $options: 'i' };
    const finalFilter = {
      ...filter,
      $or: [
        { name: re },
        { shortDescription: re },
        { brand: re },
        { 'seo.keywords': re },
        { ingredients: re },
        { benefits: re },
      ],
    };
    const [items, total] = await Promise.all([
      ProductModel.find(finalFilter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
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
