import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { validate } from '../../../shared/middleware/validate.middleware';
import { success, created, paginate } from '../../../shared/responses';
import { contentService } from '../services';
import {
  createPostSchema, updatePostSchema,
  createCMSPageSchema, updateCMSPageSchema,
  createIngredientSchema, updateIngredientSchema,
  createTestimonialSchema, updateTestimonialSchema,
  createFAQSchema, updateFAQSchema,
} from '../validators';

export class ContentController {
  // ─── Public ───────────────────────────────────────────────────
  listPublished = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await contentService.listPublished(page, limit);
      return paginate(res, result.items, result.total, result.page, result.limit);
    } catch (err) { next(err); }
  };

  getBySlug = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, await contentService.getBySlug(req.params.slug)); }
    catch (err) { next(err); }
  };

  // ─── Admin ────────────────────────────────────────────────────
  listAdmin = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const result = await contentService.listAdmin(page, limit);
        return paginate(res, result.items, result.total, result.page, result.limit);
      } catch (err) { next(err); }
    },
  ];

  getById = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await contentService.getById(req.params.id)); }
      catch (err) { next(err); }
    },
  ];

  create = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    validate(createPostSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return created(res, await contentService.createPost(req.body)); }
      catch (err) { next(err); }
    },
  ];

  update = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    validate(updatePostSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await contentService.updatePost(req.params.id, req.body)); }
      catch (err) { next(err); }
    },
  ];

  remove = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { await contentService.deletePost(req.params.id); return success(res, { deleted: true }); }
      catch (err) { next(err); }
    },
  ];

  // ─── CMS Pages — Public ──────────────────────────────────────
  getPageBySlug = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, await contentService.getPageBySlug(req.params.slug)); }
    catch (err) { next(err); }
  };

  // ─── CMS Pages — Admin ───────────────────────────────────────
  listPagesAdmin = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const result = await contentService.listPagesAdmin(page, limit);
        return paginate(res, result.items, result.total, result.page, result.limit);
      } catch (err) { next(err); }
    },
  ];

  getPageById = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await contentService.getPageById(req.params.id)); }
      catch (err) { next(err); }
    },
  ];

  createPage = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    validate(createCMSPageSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return created(res, await contentService.createPage(req.body)); }
      catch (err) { next(err); }
    },
  ];

  updatePage = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    validate(updateCMSPageSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await contentService.updatePage(req.params.id, req.body)); }
      catch (err) { next(err); }
    },
  ];

  removePage = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { await contentService.deletePage(req.params.id); return success(res, { deleted: true }); }
      catch (err) { next(err); }
    },
  ];

  // ─── Ingredients — Public ────────────────────────────────────
  listIngredients = async (_req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, await contentService.listIngredients()); }
    catch (err) { next(err); }
  };

  // ─── Ingredients — Admin ─────────────────────────────────────
  listIngredientsAdmin = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const result = await contentService.listIngredientsAdmin(page, limit);
        return paginate(res, result.items, result.total, result.page, result.limit);
      } catch (err) { next(err); }
    },
  ];

  getIngredientById = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await contentService.getIngredientById(req.params.id)); }
      catch (err) { next(err); }
    },
  ];

  createIngredient = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    validate(createIngredientSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return created(res, await contentService.createIngredient(req.body)); }
      catch (err) { next(err); }
    },
  ];

  updateIngredient = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    validate(updateIngredientSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await contentService.updateIngredient(req.params.id, req.body)); }
      catch (err) { next(err); }
    },
  ];

  removeIngredient = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { await contentService.deleteIngredient(req.params.id); return success(res, { deleted: true }); }
      catch (err) { next(err); }
    },
  ];

  // ─── Testimonials — Public ───────────────────────────────────
  listTestimonials = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const type = req.query.type as 'expert' | 'customer' | undefined;
      return success(res, await contentService.listTestimonials(type));
    } catch (err) { next(err); }
  };

  // ─── Testimonials — Admin ────────────────────────────────────
  listTestimonialsAdmin = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const result = await contentService.listTestimonialsAdmin(page, limit);
        return paginate(res, result.items, result.total, result.page, result.limit);
      } catch (err) { next(err); }
    },
  ];

  getTestimonialById = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await contentService.getTestimonialById(req.params.id)); }
      catch (err) { next(err); }
    },
  ];

  createTestimonial = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    validate(createTestimonialSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return created(res, await contentService.createTestimonial(req.body)); }
      catch (err) { next(err); }
    },
  ];

  updateTestimonial = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    validate(updateTestimonialSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await contentService.updateTestimonial(req.params.id, req.body)); }
      catch (err) { next(err); }
    },
  ];

  removeTestimonial = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { await contentService.deleteTestimonial(req.params.id); return success(res, { deleted: true }); }
      catch (err) { next(err); }
    },
  ];

  // ─── FAQs — Public ────────────────────────────────────────────
  listFAQs = async (_req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, await contentService.listFAQs()); }
    catch (err) { next(err); }
  };

  // ─── FAQs — Admin ─────────────────────────────────────────────
  listFAQsAdmin = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const result = await contentService.listFAQsAdmin(page, limit);
        return paginate(res, result.items, result.total, result.page, result.limit);
      } catch (err) { next(err); }
    },
  ];

  getFAQById = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await contentService.getFAQById(req.params.id)); }
      catch (err) { next(err); }
    },
  ];

  createFAQ = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    validate(createFAQSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return created(res, await contentService.createFAQ(req.body)); }
      catch (err) { next(err); }
    },
  ];

  updateFAQ = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    validate(updateFAQSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await contentService.updateFAQ(req.params.id, req.body)); }
      catch (err) { next(err); }
    },
  ];

  removeFAQ = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { await contentService.deleteFAQ(req.params.id); return success(res, { deleted: true }); }
      catch (err) { next(err); }
    },
  ];

  // ─── Instagram feed — Public ──────────────────────────────────
  instagramFeed = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const limit = parseInt(req.query.limit as string) || 6;
      return success(res, await contentService.getInstagramFeed(limit));
    } catch (err) { next(err); }
  };
}

export const contentController = new ContentController();
