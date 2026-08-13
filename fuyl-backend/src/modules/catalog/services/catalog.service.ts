import { ProductRepository } from '../repositories/product.repository';
import { VariantRepository } from '../repositories/variant.repository';
import { TagRepository, AttributeRepository, CollectionRepository } from '../repositories/taxonomy.repository';
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from '../../../shared/errors';
import mongoose from 'mongoose';
import {
  CreateProductDTO, UpdateProductDTO,
  CreateVariantDTO, UpdateVariantDTO,
  CreateAttributeDTO, CreateTagDTO, CreateCollectionDTO,
} from '../validators';
import { revalidateStorefront } from '../../../shared/services/revalidate.service';

const productRepo = new ProductRepository();
const variantRepo = new VariantRepository();
const tagRepo = new TagRepository();
const attributeRepo = new AttributeRepository();
const collectionRepo = new CollectionRepository();

export class CatalogService {
  // ─── Products ─────────────────────────────────────────────────
  async createProduct(dto: CreateProductDTO) {
    const product = await productRepo.create({
      ...dto,
      sellerId: new mongoose.Types.ObjectId(dto.sellerId),
      collectionIds: (dto.collectionIds ?? []).map((id) => new mongoose.Types.ObjectId(id)),
      tagIds: (dto.tagIds ?? []).map((id) => new mongoose.Types.ObjectId(id)),
      bundleProductIds: (dto.bundleProductIds ?? []).map((id) => new mongoose.Types.ObjectId(id)),
    } as any);
    void revalidateStorefront(['/', '/collections/all', `/products/${dto.seo?.slug}`]);
    return product;
  }

  async getProduct(id: string) {
    const p = await productRepo.findById(id);
    if (!p || p.isDeleted) throw new NotFoundError('Product');
    return p;
  }

  async getProductBySlug(slug: string) {
    const p = await productRepo.findBySlug(slug);
    if (!p || p.isDeleted) throw new NotFoundError('Product');
    return p;
  }

  async updateProduct(id: string, dto: UpdateProductDTO) {
    const updated = await productRepo.update(id, dto as any);
    if (!updated) throw new NotFoundError('Product');
    void revalidateStorefront(['/', '/collections/all', `/products/${updated.seo?.slug}`]);
    return updated;
  }

  async deleteProduct(id: string) {
    const existing = await productRepo.findById(id);
    await productRepo.softDelete(id);
    void revalidateStorefront(['/', '/collections/all', ...(existing ? [`/products/${existing.seo?.slug}`] : [])]);
  }

  async publish(id: string) {
    const updated = await productRepo.publish(id);
    if (updated) void revalidateStorefront(['/', '/collections/all', `/products/${updated.seo?.slug}`]);
    return updated;
  }
  async unpublish(id: string) {
    const updated = await productRepo.unpublish(id);
    if (updated) void revalidateStorefront(['/', '/collections/all', `/products/${updated.seo?.slug}`]);
    return updated;
  }

  // Called by the review module whenever a review's approved-status changes
  // (moderate/update/delete) — keeps the product's own cached rating fields
  // (read by product listings and the PDP) in sync with the live,
  // approved-only aggregate reviewService computes.
  async updateProductRating(productId: string, average: number, count: number) {
    await productRepo.updateRating(productId, average, count);
  }

  async listProducts(page = 1, limit = 20, filter: Record<string, unknown> = {}) {
    return productRepo.paginate({ isDeleted: false, ...filter }, page, limit);
  }

  async listPublished(page = 1, limit = 20, filter: Record<string, unknown> = {}) {
    return productRepo.listPublished(filter, page, limit);
  }

  async search(query: string, page = 1, limit = 20, filter: Record<string, unknown> = {}) {
    return productRepo.search(query, { isPublished: true, isDeleted: false, ...filter }, page, limit);
  }

  // ─── Variants ─────────────────────────────────────────────────
  async createVariant(dto: CreateVariantDTO) {
    const product = await productRepo.findById(dto.productId);
    if (!product) throw new NotFoundError('Product');

    const existingSku = await variantRepo.findBySku(dto.sku);
    if (existingSku) throw new ConflictError(`SKU ${dto.sku} already exists`);

    const attrClash = await variantRepo.findByProductAndAttributes(dto.productId, dto.attributes ?? {});
    if (attrClash) throw new ConflictError('A variant with this exact attribute combination already exists');

    return variantRepo.create({
      ...dto,
      productId: new mongoose.Types.ObjectId(dto.productId),
    } as any);
  }

  async getVariant(id: string) {
    const v = await variantRepo.findById(id);
    if (!v) throw new NotFoundError('Variant');
    return v;
  }

  async getVariantBySku(sku: string) {
    const v = await variantRepo.findBySku(sku);
    if (!v) throw new NotFoundError('Variant');
    return v;
  }

  async listVariantsByProduct(productId: string) {
    return variantRepo.findByProduct(productId);
  }

  async updateVariant(id: string, dto: UpdateVariantDTO) {
    if (dto.sku) {
      const skuOwner = await variantRepo.findBySku(dto.sku);
      if (skuOwner && skuOwner._id.toString() !== id) throw new ConflictError(`SKU ${dto.sku} already exists`);
    }
    if (dto.attributes) {
      const existing = await variantRepo.findById(id);
      if (!existing) throw new NotFoundError('Variant');
      const attrClash = await variantRepo.findByProductAndAttributes(existing.productId, dto.attributes, id);
      if (attrClash) throw new ConflictError('A variant with this exact attribute combination already exists');
    }

    const updated = await variantRepo.update(id, dto as any);
    if (!updated) throw new NotFoundError('Variant');
    return updated;
  }

  async deactivateVariant(id: string) {
    await variantRepo.deactivate(id);
  }

  // ─── Pricing (used by subscription module) ────────────────────
  /**
   * Returns the effective sell price for a product/variant.
   * Used by subscription.service.fetchBasePrice() — wires to real catalog.
   */
  async getPrice(productId: string, variantId?: string): Promise<{ price: number; currency: string }> {
    if (variantId) {
      const v = await variantRepo.getEffectivePrice(variantId);
      if (v) return { price: v.price, currency: v.currency };
    }
    const p = await productRepo.getEffectivePrice(productId);
    if (!p) throw new NotFoundError('Product');
    return { price: p.price, currency: p.currency };
  }

  /**
   * Returns whether a product/variant is eligible for subscription.
   */
  async isSubscribable(productId: string, variantId?: string): Promise<boolean> {
    const product = await productRepo.findById(productId);
    if (!product || !product.isPublished || product.isDeleted) return false;
    if (!product.isSubscribable) return false;
    if (variantId) {
      const v = await variantRepo.findById(variantId);
      if (!v || !v.isActive || !v.isSubscribable) return false;
    }
    return true;
  }

  // ─── Tags ─────────────────────────────────────────────────────
  async createTag(dto: CreateTagDTO) {
    const existing = await tagRepo.findBySlug(dto.slug);
    if (existing) throw new ConflictError(`Tag slug "${dto.slug}" already exists`);
    return tagRepo.create(dto);
  }
  async listTags() { return tagRepo.findAll(); }

  // ─── Attributes ───────────────────────────────────────────────
  async createAttribute(dto: CreateAttributeDTO) {
    const existing = await attributeRepo.findBySlug(dto.slug);
    if (existing) throw new ConflictError(`Attribute slug "${dto.slug}" already exists`);
    return attributeRepo.create(dto);
  }
  async listAttributes() { return attributeRepo.findAll(); }
  async listFilterableAttributes() { return attributeRepo.findFilterable(); }

  // ─── Collections ──────────────────────────────────────────────
  async createCollection(dto: CreateCollectionDTO) {
    const existing = await collectionRepo.findBySlug(dto.slug);
    if (existing) throw new ConflictError(`Collection slug "${dto.slug}" already exists`);
    return collectionRepo.create(dto);
  }
  async getCollection(id: string) {
    const c = await collectionRepo.findById(id);
    if (!c) throw new NotFoundError('Collection');
    return c;
  }
  async getCollectionBySlug(slug: string) {
    const c = await collectionRepo.findBySlug(slug);
    if (!c) throw new NotFoundError('Collection');
    return c;
  }
  async listCollections() { return collectionRepo.findActive(); }
  async updateCollection(id: string, dto: Partial<CreateCollectionDTO>) {
    const updated = await collectionRepo.update(id, dto as any);
    if (!updated) throw new NotFoundError('Collection');
    return updated;
  }
  async deactivateCollection(id: string) { await collectionRepo.deactivate(id); }
}

export const catalogService = new CatalogService();
