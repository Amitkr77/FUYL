import { ProductRepository } from '../repositories/product.repository';
import { VariantRepository } from '../repositories/variant.repository';
import { CategoryRepository } from '../repositories/category.repository';
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
  CreateCategoryDTO, UpdateCategoryDTO,
  CreateAttributeDTO, CreateTagDTO, CreateCollectionDTO,
} from '../validators';
import { revalidateStorefront } from '../../../shared/services/revalidate.service';

const productRepo = new ProductRepository();
const variantRepo = new VariantRepository();
const categoryRepo = new CategoryRepository();
const tagRepo = new TagRepository();
const attributeRepo = new AttributeRepository();
const collectionRepo = new CollectionRepository();

export class CatalogService {
  // ─── Products ─────────────────────────────────────────────────
  async createProduct(dto: CreateProductDTO) {
    // Validate categories exist
    if (dto.categoryIds?.length) {
      for (const cid of dto.categoryIds) {
        const c = await categoryRepo.findById(cid);
        if (!c) throw new NotFoundError(`Category ${cid}`);
      }
    }
    const product = await productRepo.create({
      ...dto,
      sellerId: new mongoose.Types.ObjectId(dto.sellerId),
      categoryIds: (dto.categoryIds ?? []).map((id) => new mongoose.Types.ObjectId(id)),
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

  // ─── Categories ───────────────────────────────────────────────
  async createCategory(dto: CreateCategoryDTO) {
    const existing = await categoryRepo.findBySlug(dto.slug);
    if (existing) throw new ConflictError(`Category slug "${dto.slug}" already exists`);
    return categoryRepo.create({
      ...dto,
      parentId: dto.parentId ? new mongoose.Types.ObjectId(dto.parentId) : undefined,
    } as any);
  }

  async getCategory(id: string) {
    const c = await categoryRepo.findById(id);
    if (!c) throw new NotFoundError('Category');
    return c;
  }

  async getCategoryTree() {
    const roots = await categoryRepo.findRoots();
    return roots;
  }

  async getCategoryChildren(parentId: string) {
    return categoryRepo.findChildren(parentId);
  }

  async listCategories() { return categoryRepo.findAll({ isActive: true }); }

  async updateCategory(id: string, dto: UpdateCategoryDTO) {
    const updated = await categoryRepo.update(id, dto as any);
    if (!updated) throw new NotFoundError('Category');
    return updated;
  }

  async deactivateCategory(id: string) { await categoryRepo.deactivate(id); }

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
