import { Router } from 'express';
import { authOptional, authRequired } from '../../../shared/middleware/auth.middleware';
import { catalogController } from '../controllers';

const router = Router();

// ─── Public catalog browsing ─────────────────────────────────────
router.get('/catalog/products', authOptional, catalogController.listPublished);
router.get('/catalog/products/search', authOptional, catalogController.search);
router.get('/catalog/products/:id', authOptional, catalogController.getProduct);
router.get('/catalog/products/slug/:slug', authOptional, catalogController.getProductBySlug);
router.get('/catalog/products/:productId/variants', authOptional, catalogController.listVariantsByProduct);
router.get('/catalog/variants/:id', authOptional, catalogController.getVariant);
router.get('/catalog/variants/sku/:sku', authOptional, catalogController.getVariantBySku);
router.get('/catalog/categories', authOptional, catalogController.listCategories);
router.get('/catalog/categories/tree', authOptional, catalogController.getCategoryTree);
router.get('/catalog/categories/:id', authOptional, catalogController.getCategory);
router.get('/catalog/categories/:id/children', authOptional, catalogController.getCategoryChildren);
router.get('/catalog/tags', authOptional, catalogController.listTags);
router.get('/catalog/attributes', authOptional, catalogController.listAttributes);
router.get('/catalog/attributes/filterable', authOptional, catalogController.listFilterableAttributes);
router.get('/catalog/collections', authOptional, catalogController.listCollections);
router.get('/catalog/collections/:id', authOptional, catalogController.getCollection);
router.get('/catalog/collections/slug/:slug', authOptional, catalogController.getCollectionBySlug);

// ─── Admin/seller: products ──────────────────────────────────────
router.post('/admin/catalog/products', authRequired, catalogController.createProduct);
router.patch('/admin/catalog/products/:id', authRequired, catalogController.updateProduct);
router.delete('/admin/catalog/products/:id', authRequired, catalogController.deleteProduct);
router.post('/admin/catalog/products/:id/publish', authRequired, catalogController.publishProduct);
router.post('/admin/catalog/products/:id/unpublish', authRequired, catalogController.unpublishProduct);
router.get('/admin/catalog/products', authRequired, catalogController.listProducts);

// ─── Admin/seller: variants ──────────────────────────────────────
router.post('/admin/catalog/variants', authRequired, catalogController.createVariant);
router.patch('/admin/catalog/variants/:id', authRequired, catalogController.updateVariant);
router.delete('/admin/catalog/variants/:id', authRequired, catalogController.deactivateVariant);

// ─── Admin: categories, tags, attributes, collections ────────────
router.post('/admin/catalog/categories', authRequired, catalogController.createCategory);
router.patch('/admin/catalog/categories/:id', authRequired, catalogController.updateCategory);

router.post('/admin/catalog/tags', authRequired, catalogController.createTag);

router.post('/admin/catalog/attributes', authRequired, catalogController.createAttribute);

router.post('/admin/catalog/collections', authRequired, catalogController.createCollection);
router.patch('/admin/catalog/collections/:id', authRequired, catalogController.updateCollection);
router.delete('/admin/catalog/collections/:id', authRequired, catalogController.deactivateCollection);

// ─── Health ──────────────────────────────────────────────────────
router.get('/catalog/health', (_req, res) => {
  res.json({ success: true, module: 'catalog', status: 'active' });
});

export default router;
