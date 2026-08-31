import { apiFetch } from './client'
import type { CMSPage, BlogPost, Ingredient, Testimonial, FAQ, InstagramPost } from '@/types/content'
export interface StorefrontHeroSlide{id:string;eyebrow:string;headline:string;subheading:string;image:string;imageAlt:string;primaryCtaLabel:string;primaryCtaHref:string;secondaryCtaLabel?:string;secondaryCtaHref?:string}
export interface StorefrontHero{isActive:boolean;autoplayMs:number;slides:StorefrontHeroSlide[]}
export async function getStorefrontHero():Promise<StorefrontHero|null>{try{const section=await apiFetch<{isActive:boolean;data:Omit<StorefrontHero,'isActive'>}|null>('/storefront-sections/home-hero',{revalidate:60,tags:['storefront-hero']});return section?{isActive:section.isActive,...section.data}:null}catch{return null}}

export interface AnnouncementBarCMS{text:string;linkHref:string;linkText:string;dismissible:boolean}
export async function getAnnouncementBar():Promise<AnnouncementBarCMS|null>{try{const s=await apiFetch<{isActive:boolean;data:AnnouncementBarCMS}|null>('/storefront-sections/announcement-bar',{revalidate:300,tags:['announcement-bar']});return(s?.isActive&&s.data?.text)?s.data:null}catch{return null}}

export interface PrebookingModalCMS{
  floatingButtonLabel:string
  delayMs:number
  capacity:number
  badge:string
  headline:string
  description:string
  submitButtonLabel:string
  privacyNote:string
  showDonation:boolean
  donationLabel:string
  donationSublabel:string
  successHeadline:string
  successDescription:string
  whatsappButtonLabel:string
  continueShoppingLabel:string
}
export async function getPrebookingModalSettings():Promise<PrebookingModalCMS|null>{try{const s=await apiFetch<{isActive:boolean;data:PrebookingModalCMS}|null>('/storefront-sections/prebooking-modal',{revalidate:300,tags:['prebooking-modal']});return s?.isActive?s.data:null}catch{return null}}

export interface PopupBannerCMS{title:string;body:string;imageUrl:string;ctaLabel:string;ctaHref:string;delayMs:number;frequency:'always'|'once_per_session'|'once_ever'}
export async function getPopupBanner():Promise<PopupBannerCMS|null>{try{const s=await apiFetch<{isActive:boolean;data:PopupBannerCMS}|null>('/storefront-sections/popup-banner',{revalidate:300,tags:['popup-banner']});return(s?.isActive&&s.data?.title)?s.data:null}catch{return null}}

// ─── Backend raw shapes — all of these return Mongo's `_id`, not the `id`
// these frontend types declare, so each needs the same _id -> id mapping
// mapPost() already does for BlogPost below.
interface BackendCMSPage {
  _id: string
  slug: string
  title: string
  body: string
  seoTitle?: string
  seoDescription?: string
}

function mapPage(p: BackendCMSPage): CMSPage {
  return {
    id:             p._id,
    slug:           p.slug,
    title:          p.title,
    body:           p.body,
    seoTitle:       p.seoTitle,
    seoDescription: p.seoDescription,
  }
}

export async function getPage(slug: string): Promise<CMSPage> {
  const raw = await apiFetch<BackendCMSPage>(`/pages/${slug}`, {
    tags:       [`page-${slug}`],
    revalidate: 3600,
  })
  return mapPage(raw)
}

export async function getPagePreview(id: string, token: string): Promise<CMSPage> {
  const raw = await apiFetch<BackendCMSPage>(`/pages/preview/${encodeURIComponent(id)}?token=${encodeURIComponent(token)}`, { cache: 'no-store' })
  return mapPage(raw)
}

export interface NavigationPage {
  label: string
  href: string
  placement: 'header' | 'footer' | 'both'
}

export async function getNavigationPages(): Promise<NavigationPage[]> {
  const raw = await apiFetch<Array<BackendCMSPage & { navigationPlacement: 'header' | 'footer' | 'both'; navigationLabel?: string }>>('/pages/navigation', {
    tags: ['page-navigation'], revalidate: 60,
  })
  return raw.map((page) => ({ label: page.navigationLabel?.trim() || page.title, href: `/pages/${page.slug}`, placement: page.navigationPlacement }))
}

// ─── Backend raw shape (fuyl-backend's content/models/post.model.ts) ───────
// `content` is HTML — rendered with dangerouslySetInnerHTML on the blog
// detail page, not plain text. `tags` falls back to wrapping `category`
// only for older posts saved before the tags field existed. readTime is
// computed client-side (~200 wpm), not stored.
interface BackendPost {
  _id: string
  slug: string
  title: string
  excerpt?: string
  content: string
  image?: string
  category: string
  tags?: string[]
  author: string
  publishedAt?: string
  createdAt: string
}

function mapPost(p: BackendPost): BlogPost {
  const words = p.content.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length
  return {
    id:          p._id,
    slug:        p.slug,
    title:       p.title,
    excerpt:     p.excerpt || `${p.content.replace(/<[^>]*>/g, ' ').slice(0, 160)}…`,
    body:        p.content,
    author:      p.author,
    publishedAt: p.publishedAt ?? p.createdAt,
    image:       p.image ?? '',
    imageAlt:    p.title,
    tags:        p.tags?.length ? p.tags : [p.category],
    readTime:    Math.max(1, Math.round(words / 200)),
  }
}

export async function getPosts(params?: { limit?: number; tag?: string }): Promise<BlogPost[]> {
  const qs = new URLSearchParams()
  if (params?.limit) qs.set('limit', String(params.limit))
  // Note: the backend doesn't support filtering by tag/category yet — `tag`
  // is accepted here for API-shape compatibility but currently has no effect.
  const raw = await apiFetch<BackendPost[]>(`/posts?${qs.toString()}`, {
    tags:       ['posts'],
    revalidate: 1800,
  })
  return raw.map(mapPost)
}

// Full-text search over published learn/blog articles (backend
// GET /posts/search?q=). Returns [] on empty query or any failure so the
// global search can degrade gracefully.
export async function searchPosts(query: string, limit = 6): Promise<BlogPost[]> {
  const q = query.trim()
  if (!q) return []
  const qs = new URLSearchParams({ q, limit: String(limit) })
  try {
    const raw = await apiFetch<BackendPost[]>(`/posts/search?${qs.toString()}`, {
      cache: 'no-store',
    })
    return raw.map(mapPost)
  } catch {
    return []
  }
}

export async function getPost(slug: string): Promise<BlogPost> {
  const raw = await apiFetch<BackendPost>(`/posts/${slug}`, {
    tags:       [`post-${slug}`],
    revalidate: 1800,
  })
  return mapPost(raw)
}

interface BackendIngredient {
  _id: string
  slug: string
  name: string
  amount: string
  benefit: string
  description: string
  image: string
  category: Ingredient['category']
  clinicalBacking?: string
}

function mapIngredient(i: BackendIngredient): Ingredient {
  return {
    id:              i._id,
    slug:            i.slug,
    name:            i.name,
    amount:          i.amount,
    benefit:         i.benefit,
    description:     i.description,
    image:           i.image,
    category:        i.category,
    clinicalBacking: i.clinicalBacking,
  }
}

export async function getIngredients(): Promise<Ingredient[]> {
  const raw = await apiFetch<BackendIngredient[]>('/ingredients', {
    tags:       ['ingredients'],
    revalidate: 60,
  })
  return raw.map(mapIngredient)
}

interface BackendTestimonial {
  _id: string
  name: string
  title?: string
  type: 'expert' | 'customer'
  body: string
  rating?: number
  image?: string
}

function mapTestimonial(t: BackendTestimonial): Testimonial {
  return {
    id:     t._id,
    name:   t.name,
    title:  t.title,
    type:   t.type,
    body:   t.body,
    rating: t.rating,
    image:  t.image,
  }
}

export async function getTestimonials(type?: 'expert' | 'customer'): Promise<Testimonial[]> {
  const qs = type ? `?type=${type}` : ''
  const raw = await apiFetch<BackendTestimonial[]>(`/testimonials${qs}`, {
    tags:       ['testimonials'],
    revalidate: 3600,
  })
  return raw.map(mapTestimonial)
}

interface BackendFAQ {
  _id: string
  question: string
  answer: string
}

function mapFAQ(f: BackendFAQ): FAQ {
  return { id: f._id, question: f.question, answer: f.answer }
}

export async function getFAQs(): Promise<FAQ[]> {
  const raw = await apiFetch<BackendFAQ[]>('/faqs', {
    tags:       ['faqs'],
    revalidate: false,
  })
  return raw.map(mapFAQ)
}

// Already shaped exactly like InstagramPost server-side (content.service.ts's
// getInstagramFeed) — no _id/mapping needed. Instagram's token caps at
// ~200 calls/hour, so the backend itself caches for an hour; this just needs
// to survive being unreachable without taking the homepage down with it —
// callers (InstagramFeed.tsx) fall back to static placeholders on [].
export async function getInstagramPosts(limit?: number): Promise<InstagramPost[]> {
  try {
    const query = limit ? `?limit=${limit}` : ''
    return await apiFetch<InstagramPost[]>(`/instagram${query}`, {
      // The backend already caches the complete feed and the Instagram
      // webhook invalidates it. Avoid a second frontend cache that could keep
      // an empty/stale feed visible for another hour.
      cache: 'no-store',
    })
  } catch {
    return []
  }
}

export interface PrebookingAvailability { claimed: number; capacity: number; remaining: number; full: boolean }

export async function getPrebookingAvailability(): Promise<PrebookingAvailability> {
  return apiFetch('/prebookings/availability', { cache: 'no-store' })
}

export async function submitPrebookingLead(input: { name: string; email: string; phone: string; source?: string; wantsToDonate?: boolean }): Promise<{ submitted: boolean; message: string; claimed: number; capacity: number; remaining: number }> {
  return apiFetch('/prebookings', { method: 'POST', body: input })
}

// Lifecycle state returned by the subscribe endpoint (double opt-in).
export type NewsletterSubscribeStatus =
  | 'pending'            // new address — confirmation email sent
  | 'already_subscribed' // already active on the list
  | 'reactivating'       // was unsubscribed before — re-confirmation sent

export async function subscribeNewsletter(
  email: string,
  source?: string,
): Promise<{ status: NewsletterSubscribeStatus }> {
  return apiFetch('/newsletter/subscribe', {
    method: 'POST',
    body:   source ? { email, source } : { email },
  })
}

export async function verifyNewsletter(
  token: string,
): Promise<{ verified: boolean; email?: string; alreadyVerified?: boolean; reason?: 'invalid' | 'expired' }> {
  return apiFetch('/newsletter/verify', {
    method: 'POST',
    body:   { token },
  })
}

export async function unsubscribeNewsletter(
  token: string,
): Promise<{ unsubscribed: boolean; email?: string; alreadyUnsubscribed?: boolean; reason?: 'invalid' }> {
  return apiFetch('/newsletter/unsubscribe', {
    method: 'POST',
    body:   { token },
  })
}

export async function resendNewsletterVerification(email: string): Promise<void> {
  return apiFetch('/newsletter/resend', {
    method: 'POST',
    body:   { email },
  })
}

export interface ContactFormInput {
  name:    string
  email:   string
  phone?:  string
  topic?:  string
  message: string
}

export async function submitContactForm(input: ContactFormInput): Promise<void> {
  await apiFetch('/contact', {
    method: 'POST',
    body:   input,
  })
}
