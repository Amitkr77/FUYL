import { PostRepository } from '../repositories/post.repository';
import { CMSPageRepository } from '../repositories/cmsPage.repository';
import { IngredientRepository } from '../repositories/ingredient.repository';
import { TestimonialRepository } from '../repositories/testimonial.repository';
import { FAQRepository } from '../repositories/faq.repository';
import { NotFoundError } from '../../../shared/errors';
import {
  CreatePostDTO, UpdatePostDTO,
  CreateCMSPageDTO, UpdateCMSPageDTO,
  CreateIngredientDTO, UpdateIngredientDTO,
  CreateTestimonialDTO, UpdateTestimonialDTO,
  CreateFAQDTO, UpdateFAQDTO,
} from '../validators';
import { revalidateStorefront } from '../../../shared/services/revalidate.service';
import { cacheService } from '../../../shared/services/cache.service';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';

const postRepo = new PostRepository();
const cmsPageRepo = new CMSPageRepository();
const ingredientRepo = new IngredientRepository();
const testimonialRepo = new TestimonialRepository();
const faqRepo = new FAQRepository();

function slugify(title: string): string {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

class ContentService {
  private async uniqueSlug(title: string): Promise<string> {
    const base = slugify(title) || 'post';
    let slug = base;
    let n = 1;
    while (await postRepo.slugExists(slug)) {
      slug = `${base}-${++n}`;
    }
    return slug;
  }

  private async uniquePageSlug(title: string): Promise<string> {
    const base = slugify(title) || 'page';
    let slug = base;
    let n = 1;
    while (await cmsPageRepo.slugExists(slug)) {
      slug = `${base}-${++n}`;
    }
    return slug;
  }

  private async uniqueIngredientSlug(name: string): Promise<string> {
    const base = slugify(name) || 'ingredient';
    let slug = base;
    let n = 1;
    while (await ingredientRepo.slugExists(slug)) {
      slug = `${base}-${++n}`;
    }
    return slug;
  }

  async createPost(dto: CreatePostDTO) {
    const slug = await this.uniqueSlug(dto.title);
    const post = await postRepo.create({
      ...dto,
      slug,
      publishedAt: dto.status === 'published' ? new Date() : undefined,
    });
    if (dto.status === 'published') void revalidateStorefront(['/', '/pages/learn', `/pages/learn/${slug}`]);
    return post;
  }

  async updatePost(id: string, dto: UpdatePostDTO) {
    const patch: Partial<UpdatePostDTO> & { publishedAt?: Date } = { ...dto };
    if (dto.status === 'published') {
      const existing = await postRepo.findById(id);
      if (existing && !existing.publishedAt) patch.publishedAt = new Date();
    }
    const updated = await postRepo.update(id, patch);
    if (!updated) throw new NotFoundError('Post');
    if (updated.status === 'published') void revalidateStorefront(['/', '/pages/learn', `/pages/learn/${updated.slug}`]);
    return updated;
  }

  async deletePost(id: string) {
    const existing = await postRepo.findById(id);
    await postRepo.delete(id);
    if (existing) void revalidateStorefront(['/', '/pages/learn', `/pages/learn/${existing.slug}`]);
  }

  async getById(id: string) {
    const post = await postRepo.findById(id);
    if (!post) throw new NotFoundError('Post');
    return post;
  }

  // Public read — approved/published only, increments the view counter.
  async getBySlug(slug: string) {
    const post = await postRepo.findBySlug(slug);
    if (!post || post.status !== 'published') throw new NotFoundError('Post');
    await postRepo.incrementViews(post._id);
    return post;
  }

  async listAdmin(page = 1, limit = 20) {
    return postRepo.paginate({}, page, limit);
  }

  async listPublished(page = 1, limit = 20) {
    return postRepo.paginate({ status: 'published' }, page, limit);
  }

  // ─── CMS Pages ──────────────────────────────────────────────────
  async createPage(dto: CreateCMSPageDTO) {
    const slug = await this.uniquePageSlug(dto.title);
    const page = await cmsPageRepo.create({ ...dto, slug });
    if (dto.status === 'published') void revalidateStorefront(['/', `/pages/${slug}`]);
    return page;
  }

  async updatePage(id: string, dto: UpdateCMSPageDTO) {
    const updated = await cmsPageRepo.update(id, dto);
    if (!updated) throw new NotFoundError('Page');
    if (updated.status === 'published') void revalidateStorefront(['/', `/pages/${updated.slug}`]);
    return updated;
  }

  async deletePage(id: string) {
    const existing = await cmsPageRepo.findById(id);
    await cmsPageRepo.delete(id);
    if (existing) void revalidateStorefront(['/', `/pages/${existing.slug}`]);
  }

  async getPageById(id: string) {
    const page = await cmsPageRepo.findById(id);
    if (!page) throw new NotFoundError('Page');
    return page;
  }

  async getPageBySlug(slug: string) {
    const page = await cmsPageRepo.findBySlug(slug);
    if (!page || page.status !== 'published') throw new NotFoundError('Page');
    return page;
  }

  async listPagesAdmin(page = 1, limit = 20) {
    return cmsPageRepo.paginate({}, page, limit);
  }

  // ─── Ingredients ────────────────────────────────────────────────
  async createIngredient(dto: CreateIngredientDTO) {
    const slug = await this.uniqueIngredientSlug(dto.name);
    const ingredient = await ingredientRepo.create({ ...dto, slug });
    void revalidateStorefront(['/pages/ingredients']);
    return ingredient;
  }

  async updateIngredient(id: string, dto: UpdateIngredientDTO) {
    const updated = await ingredientRepo.update(id, dto);
    if (!updated) throw new NotFoundError('Ingredient');
    void revalidateStorefront(['/pages/ingredients']);
    return updated;
  }

  async deleteIngredient(id: string) {
    await ingredientRepo.delete(id);
    void revalidateStorefront(['/pages/ingredients']);
  }

  async getIngredientById(id: string) {
    const ingredient = await ingredientRepo.findById(id);
    if (!ingredient) throw new NotFoundError('Ingredient');
    return ingredient;
  }

  async listIngredients() {
    return ingredientRepo.list({ isActive: true });
  }

  async listIngredientsAdmin(page = 1, limit = 50) {
    return ingredientRepo.paginate({}, page, limit);
  }

  // ─── Testimonials ───────────────────────────────────────────────
  async createTestimonial(dto: CreateTestimonialDTO) {
    const testimonial = await testimonialRepo.create(dto);
    void revalidateStorefront(['/']);
    return testimonial;
  }

  async updateTestimonial(id: string, dto: UpdateTestimonialDTO) {
    const updated = await testimonialRepo.update(id, dto);
    if (!updated) throw new NotFoundError('Testimonial');
    void revalidateStorefront(['/']);
    return updated;
  }

  async deleteTestimonial(id: string) {
    await testimonialRepo.delete(id);
    void revalidateStorefront(['/']);
  }

  async getTestimonialById(id: string) {
    const testimonial = await testimonialRepo.findById(id);
    if (!testimonial) throw new NotFoundError('Testimonial');
    return testimonial;
  }

  async listTestimonials(type?: 'expert' | 'customer') {
    return testimonialRepo.list({ isActive: true, ...(type ? { type } : {}) });
  }

  async listTestimonialsAdmin(page = 1, limit = 50) {
    return testimonialRepo.paginate({}, page, limit);
  }

  // ─── FAQs ───────────────────────────────────────────────────────
  async createFAQ(dto: CreateFAQDTO) {
    const faq = await faqRepo.create(dto);
    void revalidateStorefront(['/']);
    return faq;
  }

  async updateFAQ(id: string, dto: UpdateFAQDTO) {
    const updated = await faqRepo.update(id, dto);
    if (!updated) throw new NotFoundError('FAQ');
    void revalidateStorefront(['/']);
    return updated;
  }

  async deleteFAQ(id: string) {
    await faqRepo.delete(id);
    void revalidateStorefront(['/']);
  }

  async getFAQById(id: string) {
    const faq = await faqRepo.findById(id);
    if (!faq) throw new NotFoundError('FAQ');
    return faq;
  }

  async listFAQs() {
    return faqRepo.list({ isActive: true });
  }

  async listFAQsAdmin(page = 1, limit = 50) {
    return faqRepo.paginate({}, page, limit);
  }

  // ─── Instagram feed ─────────────────────────────────────────────
  // Uses "Instagram API with Instagram Login" (graph.instagram.com) — the
  // replacement for the Basic Display API Meta deprecated in Dec 2024.
  // Cached in Redis since Instagram caps a token at ~200 calls/hour and the
  // homepage doesn't need fresher-than-hourly posts. Every failure mode
  // (no token configured, Instagram API error, Redis unreachable) resolves
  // to an empty array rather than throwing, so the homepage always renders —
  // the frontend falls back to static placeholders when this comes back empty.
  async getInstagramFeed(limit = 6): Promise<InstagramPost[]> {
    if (!env.instagram.accessToken) return [];

    const cacheKey = 'content:instagram:posts';
    try {
      const cached = await cacheService.get<InstagramPost[]>(cacheKey);
      if (cached) return cached.slice(0, limit);
    } catch (err) {
      logger.warn('[content] instagram cache read failed', err);
    }

    try {
      const fields = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp';
      const url = `https://graph.instagram.com/me/media?fields=${fields}&access_token=${env.instagram.accessToken}&limit=25`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Instagram API responded ${res.status}: ${await res.text()}`);
      const json = (await res.json()) as { data?: InstagramMediaRaw[] };

      const posts: InstagramPost[] = (json.data ?? [])
        .filter((p) => p.media_type === 'VIDEO' ? !!p.thumbnail_url : !!p.media_url)
        .map((p) => ({
          id: p.id,
          caption: p.caption,
          mediaUrl: p.media_type === 'VIDEO' ? p.thumbnail_url! : p.media_url,
          permalink: p.permalink,
          mediaType: p.media_type,
        }));

      try {
        await cacheService.set(cacheKey, posts, 3600);
      } catch (err) {
        logger.warn('[content] instagram cache write failed', err);
      }

      return posts.slice(0, limit);
    } catch (err) {
      logger.error('[content] failed to fetch Instagram feed', err);
      return [];
    }
  }
}

interface InstagramMediaRaw {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
}

export interface InstagramPost {
  id: string;
  caption?: string;
  mediaUrl: string;
  permalink: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
}

export const contentService = new ContentService();
