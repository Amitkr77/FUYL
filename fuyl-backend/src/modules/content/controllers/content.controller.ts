import { Request, Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { validate } from '../../../shared/middleware/validate.middleware';
import { success, created, paginate } from '../../../shared/responses';
import { contentService } from '../services';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import {
  createPostSchema, updatePostSchema,
  createCMSPageSchema, updateCMSPageSchema,
  createIngredientSchema, updateIngredientSchema,
  createTestimonialSchema, updateTestimonialSchema,
  createFAQSchema, updateFAQSchema,
  storefrontSectionSchemas,
} from '../validators';
import { StorefrontSectionModel } from '../models/storefrontSection.model';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../../../shared/errors';
import { revalidateStorefront } from '../../../shared/services/revalidate.service';
import crypto from 'crypto';

const STOREFRONT_SECTION_PATHS: Record<string, string[]> = {
  'home-hero': ['/'],
  'announcement-bar': ['/'],
  'prebooking-modal': ['/'],
  'popup-banner': ['/'],
  'page-our-story': ['/pages/our-story'],
  'page-why-fuyl': ['/pages/why-fuyl'],
  'page-privacy-policy': ['/pages/privacy-policy'],
  'page-shipping-policy': ['/pages/shipping-policy'],
  'page-cancellation-returns': ['/pages/cancellation-returns-refunds'],
  'page-terms-conditions': ['/pages/terms-conditions'],
};

export class ContentController {
  getPagePreview = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const payload = jwt.verify(String(req.query.token ?? ''), env.jwt.accessSecret) as { kind?: string; pageId?: string };
      if (payload.kind !== 'cms_page_preview' || payload.pageId !== req.params.id) throw new UnauthorizedError('Invalid page preview link');
      return success(res, await contentService.getPageById(req.params.id));
    } catch (err) {
      if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) return next(new UnauthorizedError('Page preview link is invalid or expired'));
      next(err);
    }
  };

  // ─── Public ───────────────────────────────────────────────────
  listPublished = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await contentService.listPublished(page, limit);
      return paginate(res, result.items, result.total, result.page, result.limit);
    } catch (err) { next(err); }
  };

  searchPosts = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const q = (req.query.q as string) || '';
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await contentService.searchPosts(q, page, limit);
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

  listNavigationPages = async (_req: AuthedRequest, res: Response, next: NextFunction) => {
    try { return success(res, await contentService.listNavigationPages()); }
    catch (err) { next(err); }
  };

  // ─── CMS Pages — Admin ───────────────────────────────────────
  listPagesAdmin = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const result = await contentService.listPagesAdmin(page, limit, {
          search: (req.query.q as string | undefined)?.trim().slice(0, 100),
          status: req.query.status as string | undefined,
          navigation: req.query.navigation as string | undefined,
          sort: req.query.sort as string | undefined,
        });
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

  getPageRevisions = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await contentService.getPageRevisions(req.params.id)); }
      catch (err) { next(err); }
    },
  ];

  restorePageRevision = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await contentService.restorePageRevision(req.params.id, req.params.revisionId)); }
      catch (err) { next(err); }
    },
  ];

  createPagePreviewToken = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        await contentService.getPageById(req.params.id);
        const token = jwt.sign({ kind: 'cms_page_preview', pageId: req.params.id }, env.jwt.accessSecret, { expiresIn: '10m' });
        return success(res, { token, expiresInSeconds: 600 });
      } catch (err) { next(err); }
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

  updatePageNavigation = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await contentService.updatePageNavigation(req.body?.items)); }
      catch (err) { next(err); }
    },
  ];

  auditPageQuality = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (_req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await contentService.auditPageQuality()); }
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

  reorderManagedContent = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const kind = req.params.kind;
        if (!['ingredients', 'testimonials', 'faqs'].includes(kind)) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Unknown content type' } });
        return success(res, await contentService.reorderManagedContent(kind as 'ingredients' | 'testimonials' | 'faqs', req.body?.ids));
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
      const parsedLimit = parseInt(req.query.limit as string, 10);
      const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;
      return success(res, await contentService.getInstagramFeed(limit));
    } catch (err) { next(err); }
  };

  // ─── Instagram webhook — Meta Developer verification + events ─
  // GET: Meta sends hub.challenge when you register the webhook URL — echo it
  //      back to confirm ownership. Fails silently (403) on token mismatch.
  // POST: Receive new-media events and bust the feed cache so the next
  //       GET /instagram call fetches fresh posts instead of serving stale ones.
  instagramWebhookVerify = (req: Request, res: Response) => {
    const mode      = req.query['hub.mode']         as string | undefined;
    const token     = req.query['hub.verify_token'] as string | undefined;
    const challenge = req.query['hub.challenge']    as string | undefined;

    if (mode === 'subscribe' && token === env.instagram.webhookVerifyToken) {
      logger.info('[webhook] instagram verification OK');
      return res.status(200).send(challenge);
    }
    logger.warn('[webhook] instagram verification failed — token mismatch');
    return res.sendStatus(403);
  };

  instagramWebhookEvent = async (req: Request, res: Response) => {
    // Acknowledge immediately — Meta retries if it doesn't get a 200 fast.
    res.sendStatus(200);
    try {
      await contentService.bustInstagramCache();
      logger.info('[webhook] instagram cache busted on new-media event');
    } catch (err) {
      logger.error('[webhook] instagram cache bust failed', err);
    }
  };

  getStorefrontSection = async (req:Request,res:Response,next:NextFunction)=>{try{const section=await StorefrontSectionModel.findOne({key:req.params.key});return success(res,section)}catch(err){next(err)}};
  getStorefrontSectionAdmin = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req:Request,res:Response,next:NextFunction)=>{try{const section=await StorefrontSectionModel.findOne({key:req.params.key});return success(res,section)}catch(err){next(err)}},
  ];
  getStorefrontSectionRevisions = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req:Request,res:Response,next:NextFunction)=>{try{const section=await StorefrontSectionModel.findOne({key:req.params.key}).select('+revisions');if(!section)return success(res,[]);return success(res,[...(section.revisions??[])].reverse().map((revision)=>({revisionId:revision.revisionId,title:revision.title,isActive:revision.isActive,savedAt:revision.savedAt})))}catch(err){next(err)}},
  ];
  restoreStorefrontSectionRevision = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req:Request,res:Response,next:NextFunction)=>{try{const section=await StorefrontSectionModel.findOne({key:req.params.key}).select('+revisions');if(!section)return res.status(404).json({success:false,error:{code:'NOT_FOUND',message:'Storefront section not found'}});const revision=section.revisions?.find((item)=>item.revisionId===req.params.revisionId);if(!revision)return res.status(404).json({success:false,error:{code:'NOT_FOUND',message:'Section version not found'}});const current={revisionId:crypto.randomUUID(),title:section.title,isActive:section.isActive,data:section.data,savedAt:new Date()};const restored=await StorefrontSectionModel.findByIdAndUpdate(section._id,{$set:{title:revision.title,isActive:revision.isActive,data:revision.data},$push:{revisions:{$each:[current],$slice:-20}}},{new:true,runValidators:true});await revalidateStorefront(STOREFRONT_SECTION_PATHS[req.params.key]??['/']);return success(res,restored)}catch(err){next(err)}},
  ];
  updateStorefrontSection = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req:Request,res:Response,next:NextFunction)=>{try{const schema=storefrontSectionSchemas[req.params.key];if(!schema)return res.status(404).json({success:false,error:{code:'NOT_FOUND',message:'Unknown storefront section'}});const parsed=schema.safeParse(req.body);if(!parsed.success)return res.status(400).json({success:false,error:{code:'VALIDATION_ERROR',message:'Invalid storefront section content',details:parsed.error.issues.map((issue:{path:(string|number)[];message:string})=>({path:issue.path.join('.'),message:issue.message}))}});const {title,isActive,data}=parsed.data;const existing=await StorefrontSectionModel.findOne({key:req.params.key});const update:Record<string,unknown>={$set:{title,isActive,data}};if(existing)update.$push={revisions:{$each:[{revisionId:crypto.randomUUID(),title:existing.title,isActive:existing.isActive,data:existing.data,savedAt:new Date()}],$slice:-20}};const section=await StorefrontSectionModel.findOneAndUpdate({key:req.params.key},update,{upsert:true,new:true,runValidators:true});await revalidateStorefront(STOREFRONT_SECTION_PATHS[req.params.key] ?? ['/']);return success(res,section)}catch(err){next(err)}},
  ];
}

export const contentController = new ContentController();
