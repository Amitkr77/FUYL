import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { catalogService } from '../services';
import { success, created, paginate } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import {
  createProductSchema, updateProductSchema,
  createVariantSchema, updateVariantSchema,
  createCategorySchema, updateCategorySchema,
  createAttributeSchema, createTagSchema, createCollectionSchema,
} from '../validators';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';

// getProduct/getProductBySlug are the SAME route both the storefront and the
// admin panel call (there's no separate admin single-product GET) — so
// costPerItem/profit/margin have to be gated by the requester's role at
// serialization time, not by which route was hit. authOptional on these
// routes means req.user is only populated for a real, verified token.
const PRIVILEGED_ROLES: string[] = [Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SELLER];

function serializeProduct(product: any, req: AuthedRequest) {
  const obj = typeof product?.toObject === 'function' ? product.toObject() : product;
  if (!req.user || !PRIVILEGED_ROLES.includes(req.user.role)) {
    delete obj.costPerItem;
    return obj;
  }
  if (obj.costPerItem != null && obj.basePrice != null) {
    const profit = obj.basePrice - obj.costPerItem;
    obj.profit = Math.round(profit * 100) / 100;
    obj.margin = obj.basePrice > 0 ? Math.round((profit / obj.basePrice) * 10000) / 10000 : null;
  }
  return obj;
}

export class CatalogController {
  // ─── Products (admin) ─────────────────────────────────────────
  createProduct = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SELLER),
    validate(createProductSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return created(res, serializeProduct(await catalogService.createProduct(req.body), req)); }
      catch (err) { next(err); }
    },
  ];

  getProduct = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, serializeProduct(await catalogService.getProduct(req.params.id), req)); }
    catch (err) { next(err); }
  };

  getProductBySlug = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, serializeProduct(await catalogService.getProductBySlug(req.params.slug), req)); }
    catch (err) { next(err); }
  };

  updateProduct = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SELLER),
    validate(updateProductSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, serializeProduct(await catalogService.updateProduct(req.params.id, req.body), req)); }
      catch (err) { next(err); }
    },
  ];

  deleteProduct = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SELLER),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { await catalogService.deleteProduct(req.params.id); return success(res, { deleted: true }); }
      catch (err) { next(err); }
    },
  ];

  publishProduct = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SELLER),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await catalogService.publish(req.params.id)); }
      catch (err) { next(err); }
    },
  ];

  unpublishProduct = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SELLER),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await catalogService.unpublish(req.params.id)); }
      catch (err) { next(err); }
    },
  ];

  listProducts = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SELLER),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const result = await catalogService.listProducts(page, limit);
        return paginate(res, result.items.map((p) => serializeProduct(p, req)), result.total, result.page, result.limit);
      } catch (err) { next(err); }
    },
  ];

  listPublished = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const filter: Record<string, unknown> = {};
      if (req.query.categoryId) filter.categoryIds = req.query.categoryId;
      if (req.query.tagId) filter.tagIds = req.query.tagId;
      if (req.query.brand) filter.brand = req.query.brand;
      const result = await catalogService.listPublished(page, limit, filter);
      return paginate(res, result.items.map((p) => serializeProduct(p, req)), result.total, result.page, result.limit);
    } catch (err) { next(err); }
  };

  search = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const q = (req.query.q as string) || '';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await catalogService.search(q, page, limit);
      return paginate(res, result.items.map((p) => serializeProduct(p, req)), result.total, result.page, result.limit);
    } catch (err) { next(err); }
  };

  // ─── Variants ─────────────────────────────────────────────────
  createVariant = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SELLER),
    validate(createVariantSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return created(res, await catalogService.createVariant(req.body)); }
      catch (err) { next(err); }
    },
  ];

  getVariant = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, await catalogService.getVariant(req.params.id)); }
    catch (err) { next(err); }
  };

  getVariantBySku = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, await catalogService.getVariantBySku(req.params.sku)); }
    catch (err) { next(err); }
  };

  listVariantsByProduct = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, await catalogService.listVariantsByProduct(req.params.productId)); }
    catch (err) { next(err); }
  };

  updateVariant = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SELLER),
    validate(updateVariantSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await catalogService.updateVariant(req.params.id, req.body)); }
      catch (err) { next(err); }
    },
  ];

  deactivateVariant = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN, Roles.SELLER),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { await catalogService.deactivateVariant(req.params.id); return success(res, { deactivated: true }); }
      catch (err) { next(err); }
    },
  ];

  // ─── Categories ───────────────────────────────────────────────
  createCategory = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    validate(createCategorySchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return created(res, await catalogService.createCategory(req.body)); }
      catch (err) { next(err); }
    },
  ];

  getCategory = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, await catalogService.getCategory(req.params.id)); }
    catch (err) { next(err); }
  };

  getCategoryTree = async (_req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, await catalogService.getCategoryTree()); }
    catch (err) { next(err); }
  };

  getCategoryChildren = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, await catalogService.getCategoryChildren(req.params.id)); }
    catch (err) { next(err); }
  };

  listCategories = async (_req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, await catalogService.listCategories()); }
    catch (err) { next(err); }
  };

  updateCategory = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    validate(updateCategorySchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await catalogService.updateCategory(req.params.id, req.body)); }
      catch (err) { next(err); }
    },
  ];

  // ─── Tags ─────────────────────────────────────────────────────
  createTag = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    validate(createTagSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return created(res, await catalogService.createTag(req.body)); }
      catch (err) { next(err); }
    },
  ];

  listTags = async (_req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, await catalogService.listTags()); }
    catch (err) { next(err); }
  };

  // ─── Attributes ───────────────────────────────────────────────
  createAttribute = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    validate(createAttributeSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return created(res, await catalogService.createAttribute(req.body)); }
      catch (err) { next(err); }
    },
  ];

  listAttributes = async (_req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, await catalogService.listAttributes()); }
    catch (err) { next(err); }
  };

  listFilterableAttributes = async (_req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, await catalogService.listFilterableAttributes()); }
    catch (err) { next(err); }
  };

  // ─── Collections ──────────────────────────────────────────────
  createCollection = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    validate(createCollectionSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return created(res, await catalogService.createCollection(req.body)); }
      catch (err) { next(err); }
    },
  ];

  getCollection = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, await catalogService.getCollection(req.params.id)); }
    catch (err) { next(err); }
  };

  getCollectionBySlug = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, await catalogService.getCollectionBySlug(req.params.slug)); }
    catch (err) { next(err); }
  };

  listCollections = async (_req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, await catalogService.listCollections()); }
    catch (err) { next(err); }
  };

  updateCollection = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await catalogService.updateCollection(req.params.id, req.body)); }
      catch (err) { next(err); }
    },
  ];

  deactivateCollection = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { await catalogService.deactivateCollection(req.params.id); return success(res, { deactivated: true }); }
      catch (err) { next(err); }
    },
  ];
}

export const catalogController = new CatalogController();
