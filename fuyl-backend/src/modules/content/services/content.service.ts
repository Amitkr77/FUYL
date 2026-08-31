import { PostRepository } from "../repositories/post.repository";
import { CMSPageRepository } from "../repositories/cmsPage.repository";
import { IngredientRepository } from "../repositories/ingredient.repository";
import { TestimonialRepository } from "../repositories/testimonial.repository";
import { FAQRepository } from "../repositories/faq.repository";
import { BadRequestError, NotFoundError } from "../../../shared/errors";
import {
  CreatePostDTO,
  UpdatePostDTO,
  CreateCMSPageDTO,
  UpdateCMSPageDTO,
  CreateIngredientDTO,
  UpdateIngredientDTO,
  CreateTestimonialDTO,
  UpdateTestimonialDTO,
  CreateFAQDTO,
  UpdateFAQDTO,
} from "../validators";
import { revalidateStorefront } from "../../../shared/services/revalidate.service";
import { cacheService } from "../../../shared/services/cache.service";
import { env } from "../../../config/env";
import { logger } from "../../../config/logger";
import crypto from "crypto";
import { StorefrontSectionModel } from "../models/storefrontSection.model";

const postRepo = new PostRepository();
const cmsPageRepo = new CMSPageRepository();
const ingredientRepo = new IngredientRepository();
const testimonialRepo = new TestimonialRepository();
const faqRepo = new FAQRepository();

// These slugs are implemented as dedicated Next.js routes. Allowing a CMS
// page to claim one would save successfully but never render on the storefront.
const RESERVED_PAGE_SLUGS = new Set([
  "contact", "ingredients", "learn", "our-story", "refer-and-earn", "science", "why-fuyl",
  "cancellation-returns-refunds", "privacy-policy", "shipping-policy", "terms-conditions",
]);

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

class ContentService {
  private async uniqueSlug(title: string): Promise<string> {
    const base = slugify(title) || "post";
    let slug = base;
    let n = 1;
    while (await postRepo.slugExists(slug)) {
      slug = `${base}-${++n}`;
    }
    return slug;
  }

  private async uniquePageSlug(title: string): Promise<string> {
    const base = slugify(title) || "page";
    if (RESERVED_PAGE_SLUGS.has(base)) {
      throw new BadRequestError(`The URL /pages/${base} is reserved by a built-in storefront page. Choose a different page title.`);
    }
    let slug = base;
    let n = 1;
    while (await cmsPageRepo.slugExists(slug)) {
      slug = `${base}-${++n}`;
    }
    return slug;
  }

  private async uniqueIngredientSlug(name: string): Promise<string> {
    const base = slugify(name) || "ingredient";
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
      publishedAt: dto.status === "published" ? new Date() : undefined,
    });
    if (dto.status === "published")
      void revalidateStorefront(["/", "/pages/learn", `/pages/learn/${slug}`]);
    return post;
  }

  async updatePost(id: string, dto: UpdatePostDTO) {
    const patch: Partial<UpdatePostDTO> & { publishedAt?: Date } = { ...dto };
    if (dto.status === "published") {
      const existing = await postRepo.findById(id);
      if (existing && !existing.publishedAt) patch.publishedAt = new Date();
    }
    const updated = await postRepo.update(id, patch);
    if (!updated) throw new NotFoundError("Post");
    if (updated.status === "published")
      void revalidateStorefront([
        "/",
        "/pages/learn",
        `/pages/learn/${updated.slug}`,
      ]);
    return updated;
  }

  async deletePost(id: string) {
    const existing = await postRepo.findById(id);
    await postRepo.delete(id);
    if (existing)
      void revalidateStorefront([
        "/",
        "/pages/learn",
        `/pages/learn/${existing.slug}`,
      ]);
  }

  async getById(id: string) {
    const post = await postRepo.findById(id);
    if (!post) throw new NotFoundError("Post");
    return post;
  }

  // Public read — approved/published only, increments the view counter.
  async getBySlug(slug: string) {
    const post = await postRepo.findBySlug(slug);
    if (!post || post.status !== "published") throw new NotFoundError("Post");
    await postRepo.incrementViews(post._id);
    return post;
  }

  async listAdmin(page = 1, limit = 20) {
    return postRepo.paginate({}, page, limit);
  }

  async listPublished(page = 1, limit = 20) {
    return postRepo.paginate({ status: "published" }, page, limit);
  }

  // Public full-text search over published posts only.
  async searchPosts(query: string, page = 1, limit = 10) {
    const q = query.trim();
    if (!q) return { items: [], total: 0, page, limit };
    return postRepo.search(q, { status: "published" }, page, limit);
  }

  // ─── CMS Pages ──────────────────────────────────────────────────
  async createPage(dto: CreateCMSPageDTO) {
    const slug = await this.uniquePageSlug(dto.title);
    const page = await cmsPageRepo.create({ ...dto, slug });
    // Revalidate navigation even for drafts: this also clears a stale menu
    // entry if a previous request with the same URL was cached.
    void revalidateStorefront(["/", `/pages/${slug}`]);
    return page;
  }

  async updatePage(id: string, dto: UpdateCMSPageDTO) {
    const existing = await cmsPageRepo.findById(id);
    if (!existing) throw new NotFoundError("Page");
    const updated = await cmsPageRepo.updateWithRevision(id, dto, {
      revisionId: crypto.randomUUID(),
      title: existing.title,
      body: existing.body,
      seoTitle: existing.seoTitle,
      seoDescription: existing.seoDescription,
      status: existing.status,
      navigationPlacement: existing.navigationPlacement,
      navigationLabel: existing.navigationLabel,
      navigationOrder: existing.navigationOrder,
      savedAt: new Date(),
    });
    if (!updated) throw new NotFoundError("Page");
    // Publishing, unpublishing and navigation changes must all clear both the
    // page route and root-layout navigation cache.
    void revalidateStorefront(Array.from(new Set(["/", `/pages/${existing.slug}`, `/pages/${updated.slug}`])));
    return updated;
  }

  async deletePage(id: string) {
    const existing = await cmsPageRepo.findById(id);
    await cmsPageRepo.delete(id);
    if (existing) void revalidateStorefront(["/", `/pages/${existing.slug}`]);
  }

  async getPageById(id: string) {
    const page = await cmsPageRepo.findById(id);
    if (!page) throw new NotFoundError("Page");
    return page;
  }

  async getPageRevisions(id: string) {
    const page = await cmsPageRepo.findByIdWithRevisions(id);
    if (!page) throw new NotFoundError("Page");
    return [...(page.revisions ?? [])].reverse().map((revision) => ({
      revisionId: revision.revisionId,
      title: revision.title,
      status: revision.status,
      savedAt: revision.savedAt,
    }));
  }

  async restorePageRevision(id: string, revisionId: string) {
    const page = await cmsPageRepo.findByIdWithRevisions(id);
    if (!page) throw new NotFoundError("Page");
    const revision = page.revisions?.find((item) => item.revisionId === revisionId);
    if (!revision) throw new NotFoundError("Page revision");
    return this.updatePage(id, {
      title: revision.title,
      body: revision.body,
      seoTitle: revision.seoTitle,
      seoDescription: revision.seoDescription,
      status: revision.status,
      navigationPlacement: revision.navigationPlacement,
      navigationLabel: revision.navigationLabel,
      navigationOrder: revision.navigationOrder,
    });
  }

  async getPageBySlug(slug: string) {
    const page = await cmsPageRepo.findBySlug(slug);
    if (!page || page.status !== "published") throw new NotFoundError("Page");
    return page;
  }

  async listNavigationPages() {
    return cmsPageRepo.listNavigation();
  }

  async updatePageNavigation(items: Array<{ id: string; navigationPlacement: "none" | "header" | "footer" | "both"; navigationLabel: string; navigationOrder: number }>) {
    if (!Array.isArray(items) || items.length > 200) throw new BadRequestError("Invalid navigation update");
    const ids = new Set<string>();
    const normalized = items.map((item, index) => {
      if (!item?.id || ids.has(item.id) || !["none", "header", "footer", "both"].includes(item.navigationPlacement)) {
        throw new BadRequestError("Invalid or duplicate page in navigation update");
      }
      ids.add(item.id);
      return {
        id: item.id,
        navigationPlacement: item.navigationPlacement,
        navigationLabel: String(item.navigationLabel ?? "").trim().slice(0, 80),
        navigationOrder: index,
      };
    });
    await cmsPageRepo.updateNavigation(normalized);
    await revalidateStorefront(["/"]);
    return { updated: normalized.length };
  }

  async auditPageQuality() {
    const [pages, storefrontSections] = await Promise.all([
      cmsPageRepo.listForQualityAudit(),
      StorefrontSectionModel.find({}).select('key title isActive data').lean(),
    ]);
    const publishedSlugs = new Set(pages.filter((page) => page.status === "published").map((page) => page.slug));
    const issues: Array<{ pageId: string; title: string; slug: string; type: string; severity: "error" | "warning"; message: string; editHref?: string; storefrontPath?: string }> = [];

    for (const page of pages) {
      const plainText = page.body.replace(/<[^>]*>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
      const add = (type: string, severity: "error" | "warning", message: string) => issues.push({
        pageId: String(page._id), title: page.title, slug: page.slug, type, severity, message,
        editHref: `/content/pages/${page._id}`, storefrontPath: `/pages/${page.slug}`,
      });

      if (!page.seoTitle?.trim()) add("missing_seo_title", "warning", "SEO title is missing.");
      else if (page.seoTitle.length > 60) add("long_seo_title", "warning", "SEO title is longer than the recommended 60 characters.");
      if (!page.seoDescription?.trim()) add("missing_seo_description", "warning", "SEO description is missing.");
      else if (page.seoDescription.length < 70 || page.seoDescription.length > 160) add("seo_description_length", "warning", "SEO description should normally be 70–160 characters.");
      if (plainText.length < 80) add("thin_content", "warning", plainText.length ? "Page content is very short." : "Page has no readable content.");
      if (page.status === "published" && page.navigationPlacement === "none") add("unlinked_page", "warning", "Published page is not included in header or footer navigation.");

      const imageTags = page.body.match(/<img\b[^>]*>/gi) ?? [];
      const missingAltCount = imageTags.filter((tag) => !/\balt\s*=\s*(["'])\s*[^"']+\s*\1/i.test(tag)).length;
      if (missingAltCount) add("missing_image_alt", "warning", `${missingAltCount} image${missingAltCount === 1 ? "" : "s"} missing descriptive alt text.`);

      const linkedSlugs = Array.from(page.body.matchAll(/href\s*=\s*(["'])(?:https?:\/\/(?:www\.)?fuyl\.in)?\/pages\/([^?/#"']+)/gi), (match) => {
        try { return decodeURIComponent(match[2]).toLowerCase(); } catch { return match[2].toLowerCase(); }
      });
      for (const linkedSlug of new Set(linkedSlugs)) {
        if (!publishedSlugs.has(linkedSlug)) add("broken_page_link", "error", `Links to /pages/${linkedSlug}, but that page is missing or not published.`);
      }
    }

    const managedDefinitions: Record<string, { title:string; editHref:string; storefrontPath:string }> = {
      'home-hero': { title:'Homepage Hero', editHref:'/content/hero', storefrontPath:'/' },
      'announcement-bar': { title:'Announcement Bar', editHref:'/content/announcement', storefrontPath:'/' },
      'prebooking-modal': { title:'Pre-booking Popup', editHref:'/content/prebooking-modal', storefrontPath:'/' },
      'popup-banner': { title:'Popup Banner', editHref:'/content/popup-banner', storefrontPath:'/' },
      'page-our-story': { title:'Our Story', editHref:'/content/our-story', storefrontPath:'/pages/our-story' },
      'page-why-fuyl': { title:'Why FUYL', editHref:'/content/why-fuyl', storefrontPath:'/pages/why-fuyl' },
      'page-privacy-policy': { title:'Privacy Policy', editHref:'/content/privacy-policy', storefrontPath:'/pages/privacy-policy' },
      'page-shipping-policy': { title:'Shipping Policy', editHref:'/content/shipping-policy', storefrontPath:'/pages/shipping-policy' },
      'page-cancellation-returns': { title:'Cancellation & Returns', editHref:'/content/cancellation-returns', storefrontPath:'/pages/cancellation-returns-refunds' },
      'page-terms-conditions': { title:'Terms & Conditions', editHref:'/content/terms-conditions', storefrontPath:'/pages/terms-conditions' },
    };
    const configured = new Map(storefrontSections.map((section) => [section.key, section]));
    for (const [key, definition] of Object.entries(managedDefinitions)) {
      const section = configured.get(key);
      const add = (type:string,severity:"error"|"warning",message:string) => issues.push({
        pageId:key,title:definition.title,slug:key,type,severity,message,editHref:definition.editHref,storefrontPath:definition.storefrontPath,
      });
      if (!section) { add("using_code_defaults","warning","This section has not been saved in the CMS and is using code defaults."); continue; }
      if (!section.isActive) continue;
      if (!section.data || typeof section.data !== "object" || !Object.keys(section.data).length) add("empty_managed_section","error","Visible section has no configured content.");
      if (key === "home-hero") {
        const slides = Array.isArray((section.data as {slides?:unknown}).slides) ? (section.data as {slides:Array<{isActive?:boolean;imageAlt?:string;mediaType?:string;image?:string;video?:string}>}).slides : [];
        if (!slides.some((slide) => slide.isActive !== false)) add("empty_managed_section","error","Hero is visible but has no active slides.");
        const missingAlt = slides.filter((slide) => slide.isActive !== false && slide.mediaType !== "video" && slide.image && !slide.imageAlt?.trim()).length;
        if (missingAlt) add("missing_image_alt","warning",`${missingAlt} active hero image${missingAlt===1?" is":"s are"} missing alt text.`);
      }
    }

    const errorCount = issues.filter((issue) => issue.severity === "error").length;
    const warningCount = issues.length - errorCount;
    const affectedPages = new Set(issues.map((issue) => issue.pageId)).size;
    const totalChecks = Math.max(1, (pages.length + Object.keys(managedDefinitions).length) * 5);
    const score = Math.max(0, Math.round(100 - ((errorCount * 2 + warningCount) / totalChecks) * 100));
    return {
      summary: { score, totalPages: pages.length + Object.keys(managedDefinitions).length, publishedPages: pages.filter((page) => page.status === "published").length, affectedPages, errorCount, warningCount },
      issues,
      checkedAt: new Date().toISOString(),
    };
  }

  async listPagesAdmin(page = 1, limit = 20, options: { search?: string; status?: string; navigation?: string; sort?: string } = {}) {
    const filter: Record<string, unknown> = {};
    if (options.search) {
      const escaped = options.search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [{ title: { $regex: escaped, $options: "i" } }, { slug: { $regex: escaped, $options: "i" } }];
    }
    if (options.status === "draft" || options.status === "published") filter.status = options.status;
    if (["none", "header", "footer", "both"].includes(options.navigation ?? "")) filter.navigationPlacement = options.navigation;
    const sorts: Record<string, Record<string, 1 | -1>> = {
      updated_desc: { updatedAt: -1 }, updated_asc: { updatedAt: 1 },
      title_asc: { title: 1 }, title_desc: { title: -1 },
      navigation: { navigationOrder: 1, title: 1 },
    };
    return cmsPageRepo.paginate(filter, page, limit, sorts[options.sort ?? "updated_desc"] ?? sorts.updated_desc);
  }

  // ─── Ingredients ────────────────────────────────────────────────
  async createIngredient(dto: CreateIngredientDTO) {
    const slug = await this.uniqueIngredientSlug(dto.name);
    const ingredient = await ingredientRepo.create({ ...dto, slug, order: dto.order ?? await ingredientRepo.nextOrder() });
    void revalidateStorefront(["/", "/pages/ingredients"]);
    return ingredient;
  }

  async updateIngredient(id: string, dto: UpdateIngredientDTO) {
    const updated = await ingredientRepo.update(id, dto);
    if (!updated) throw new NotFoundError("Ingredient");
    void revalidateStorefront(["/", "/pages/ingredients"]);
    return updated;
  }

  async deleteIngredient(id: string) {
    await ingredientRepo.delete(id);
    void revalidateStorefront(["/", "/pages/ingredients"]);
  }

  async getIngredientById(id: string) {
    const ingredient = await ingredientRepo.findById(id);
    if (!ingredient) throw new NotFoundError("Ingredient");
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
    const testimonial = await testimonialRepo.create({ ...dto, order: dto.order ?? await testimonialRepo.nextOrder() });
    void revalidateStorefront(["/"]);
    return testimonial;
  }

  async updateTestimonial(id: string, dto: UpdateTestimonialDTO) {
    const updated = await testimonialRepo.update(id, dto);
    if (!updated) throw new NotFoundError("Testimonial");
    void revalidateStorefront(["/"]);
    return updated;
  }

  async deleteTestimonial(id: string) {
    await testimonialRepo.delete(id);
    void revalidateStorefront(["/"]);
  }

  async getTestimonialById(id: string) {
    const testimonial = await testimonialRepo.findById(id);
    if (!testimonial) throw new NotFoundError("Testimonial");
    return testimonial;
  }

  async listTestimonials(type?: "expert" | "customer") {
    return testimonialRepo.list({ isActive: true, ...(type ? { type } : {}) });
  }

  async listTestimonialsAdmin(page = 1, limit = 50) {
    return testimonialRepo.paginate({}, page, limit);
  }

  // ─── FAQs ───────────────────────────────────────────────────────
  async createFAQ(dto: CreateFAQDTO) {
    const faq = await faqRepo.create({ ...dto, order: dto.order ?? await faqRepo.nextOrder() });
    void revalidateStorefront(["/"]);
    return faq;
  }

  async updateFAQ(id: string, dto: UpdateFAQDTO) {
    const updated = await faqRepo.update(id, dto);
    if (!updated) throw new NotFoundError("FAQ");
    void revalidateStorefront(["/"]);
    return updated;
  }

  async deleteFAQ(id: string) {
    await faqRepo.delete(id);
    void revalidateStorefront(["/"]);
  }

  async getFAQById(id: string) {
    const faq = await faqRepo.findById(id);
    if (!faq) throw new NotFoundError("FAQ");
    return faq;
  }

  async listFAQs() {
    return faqRepo.list({ isActive: true });
  }

  async listFAQsAdmin(page = 1, limit = 50) {
    return faqRepo.paginate({}, page, limit);
  }

  async reorderManagedContent(kind: "ingredients" | "testimonials" | "faqs", ids: string[]) {
    if (!Array.isArray(ids) || !ids.length || ids.length > 500 || new Set(ids).size !== ids.length || ids.some((id) => !/^[a-f\d]{24}$/i.test(id))) {
      throw new BadRequestError("Invalid content order");
    }
    if (kind === "ingredients") await ingredientRepo.setOrder(ids);
    else if (kind === "testimonials") await testimonialRepo.setOrder(ids);
    else await faqRepo.setOrder(ids);
    await revalidateStorefront(kind === "ingredients" ? ["/", "/pages/ingredients"] : ["/"]);
    return { updated: ids.length };
  }

  // ─── Instagram feed ─────────────────────────────────────────────
  // Uses "Instagram API with Instagram Login" (graph.instagram.com) — the
  // replacement for the Basic Display API Meta deprecated in Dec 2024.
  // Cached in Redis since Instagram caps a token at ~200 calls/hour and the
  // homepage doesn't need fresher-than-hourly posts. Every failure mode
  // (no token configured, Instagram API error, Redis unreachable) resolves
  // to an empty array rather than throwing, so the homepage always renders —
  // the frontend falls back to static placeholders when this comes back empty.
  async getInstagramFeed(limit?: number): Promise<InstagramPost[]> {
    if (!env.instagram.accessToken) return [];

    const cacheKey = "content:instagram:posts";
    try {
      const cached = await cacheService.get<InstagramPost[]>(cacheKey);
      if (cached) return limit ? cached.slice(0, limit) : cached;
    } catch (err) {
      logger.warn("[content] instagram cache read failed", err);
    }

    try {
      const fields =
        "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp";
      let nextUrl: string | undefined = `https://graph.instagram.com/me/media?fields=${fields}&access_token=${env.instagram.accessToken}&limit=100`;
      const media: InstagramMediaRaw[] = [];
      const visited = new Set<string>();

      // Instagram paginates media. Follow every returned page instead of
      // silently truncating the homepage to the first six/25 posts. The
      // visited guard prevents a malformed paging response from looping.
      while (nextUrl && !visited.has(nextUrl)) {
        visited.add(nextUrl);
        const res = await fetch(nextUrl);
        if (!res.ok) {
          throw new Error(
            `Instagram API responded ${res.status}: ${await res.text()}`,
          );
        }
        const json = (await res.json()) as {
          data?: InstagramMediaRaw[];
          paging?: { next?: string };
        };
        media.push(...(json.data ?? []));
        nextUrl = json.paging?.next;
      }

      const posts: InstagramPost[] = media
        .filter((p) =>
          p.media_type === "VIDEO" ? !!p.thumbnail_url : !!p.media_url,
        )
        .map((p) => ({
          id: p.id,
          caption: p.caption,
          mediaUrl: p.media_type === "VIDEO" ? p.thumbnail_url! : p.media_url,
          permalink: p.permalink,
          mediaType: p.media_type,
        }));

      try {
        await cacheService.set(cacheKey, posts, 3600);
      } catch (err) {
        logger.warn("[content] instagram cache write failed", err);
      }

      return limit ? posts.slice(0, limit) : posts;
    } catch (err) {
      logger.error("[content] failed to fetch Instagram feed", err);
      return [];
    }
  }

  async bustInstagramCache(): Promise<void> {
    await cacheService.del("content:instagram:posts");
  }
}

interface InstagramMediaRaw {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url: string;
  permalink: string;
  thumbnail_url?: string;
}

export interface InstagramPost {
  id: string;
  caption?: string;
  mediaUrl: string;
  permalink: string;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
}

export const contentService = new ContentService();
