import { Router } from 'express';
import { authRequired } from '../../../shared/middleware/auth.middleware';
import { contentController } from '../controllers';

const router = Router();

// Public — paths match what fuyl-frontend/lib/api/content.ts already calls
// (getPosts -> GET /posts, getPost -> GET /posts/:slug), which were defined
// against this exact contract before a backend existed for it.
router.get('/posts', contentController.listPublished);
router.get('/posts/:slug', contentController.getBySlug);

// Public — CMS pages, ingredients, testimonials, FAQs (matches
// fuyl-frontend/lib/api/content.ts's getPage/getIngredients/getTestimonials/getFAQs,
// which were also defined against this contract before a backend existed for it).
router.get('/pages/:slug', contentController.getPageBySlug);
router.get('/ingredients', contentController.listIngredients);
router.get('/testimonials', contentController.listTestimonials);
router.get('/faqs', contentController.listFAQs);
router.get('/instagram', contentController.instagramFeed);

// Admin
router.get('/admin/content/posts', authRequired, contentController.listAdmin);
router.get('/admin/content/posts/:id', authRequired, contentController.getById);
router.post('/admin/content/posts', authRequired, contentController.create);
router.patch('/admin/content/posts/:id', authRequired, contentController.update);
router.delete('/admin/content/posts/:id', authRequired, contentController.remove);

router.get('/admin/content/pages', authRequired, contentController.listPagesAdmin);
router.get('/admin/content/pages/:id', authRequired, contentController.getPageById);
router.post('/admin/content/pages', authRequired, contentController.createPage);
router.patch('/admin/content/pages/:id', authRequired, contentController.updatePage);
router.delete('/admin/content/pages/:id', authRequired, contentController.removePage);

router.get('/admin/content/ingredients', authRequired, contentController.listIngredientsAdmin);
router.get('/admin/content/ingredients/:id', authRequired, contentController.getIngredientById);
router.post('/admin/content/ingredients', authRequired, contentController.createIngredient);
router.patch('/admin/content/ingredients/:id', authRequired, contentController.updateIngredient);
router.delete('/admin/content/ingredients/:id', authRequired, contentController.removeIngredient);

router.get('/admin/content/testimonials', authRequired, contentController.listTestimonialsAdmin);
router.get('/admin/content/testimonials/:id', authRequired, contentController.getTestimonialById);
router.post('/admin/content/testimonials', authRequired, contentController.createTestimonial);
router.patch('/admin/content/testimonials/:id', authRequired, contentController.updateTestimonial);
router.delete('/admin/content/testimonials/:id', authRequired, contentController.removeTestimonial);

router.get('/admin/content/faqs', authRequired, contentController.listFAQsAdmin);
router.get('/admin/content/faqs/:id', authRequired, contentController.getFAQById);
router.post('/admin/content/faqs', authRequired, contentController.createFAQ);
router.patch('/admin/content/faqs/:id', authRequired, contentController.updateFAQ);
router.delete('/admin/content/faqs/:id', authRequired, contentController.removeFAQ);

// Health
router.get('/content/health', (_req, res) => {
  res.json({ success: true, module: 'content', status: 'active' });
});

export default router;
