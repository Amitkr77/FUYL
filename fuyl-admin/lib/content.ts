import { adminApiFetch, AdminApiError } from './api'

export type ContentStatus = 'draft' | 'published'
export interface HeroSlide {id:string;eyebrow:string;headline:string;subheading:string;image:string;imageAlt:string;primaryCtaLabel:string;primaryCtaHref:string;secondaryCtaLabel?:string;secondaryCtaHref?:string}
export interface HeroSection {title:string;isActive:boolean;data:{autoplayMs:number;slides:HeroSlide[]}}
export async function getHeroSection():Promise<HeroSection>{const raw=await adminApiFetch<({_id?:string}|null)&Partial<HeroSection>>('/admin/content/storefront-sections/home-hero');return{title:raw?.title??'Homepage hero',isActive:raw?.isActive??true,data:raw?.data??{autoplayMs:5000,slides:[{id:'hero-1',eyebrow:'Introducing FUYL COMPLETE+',headline:'Nourish Daily.\nFeel Stronger.\nLive longer.',subheading:'A Daily Nutrition Powder.',image:'/images/hero-slide-1.webp',imageAlt:'FUYL Complete daily nutrition',primaryCtaLabel:'SHOP FUYL COMPLETE +',primaryCtaHref:'/products/fuyl-complete'},{id:'hero-2',eyebrow:'30-Day Transformation',headline:'One Sachet\nEvery Morning\nEverything covered.',subheading:'Built For Daily Life And Long Term Health.',image:'/images/hero-slide-2.webp',imageAlt:'FUYL daily sachet',primaryCtaLabel:'START TODAY',primaryCtaHref:'/products/fuyl-complete'}]}}}
export async function updateHeroSection(input:HeroSection):Promise<void>{await adminApiFetch('/admin/content/storefront-sections/home-hero',{method:'PUT',body:input})}

// ─── CMS Pages ──────────────────────────────────────────────────────────────
interface BackendCMSPage {
  _id: string
  slug: string
  title: string
  body: string
  seoTitle?: string
  seoDescription?: string
  status: ContentStatus
  updatedAt: string
}

export interface CMSPageSummary {
  id: string
  slug: string
  title: string
  status: ContentStatus
  updatedAt: string
}

export interface CMSPageDetail extends CMSPageSummary {
  body: string
  seoTitle: string
  seoDescription: string
}

export interface CMSPageInput {
  title: string
  body: string
  seoTitle: string
  seoDescription: string
  status: ContentStatus
}

function mapPage(p: BackendCMSPage): CMSPageSummary {
  return { id: p._id, slug: p.slug, title: p.title, status: p.status, updatedAt: p.updatedAt }
}

export async function listAdminPages(): Promise<CMSPageSummary[]> {
  const raw = await adminApiFetch<BackendCMSPage[]>('/admin/content/pages?limit=100')
  return raw.map(mapPage)
}

export async function getAdminPage(id: string): Promise<CMSPageDetail | null> {
  try {
    const p = await adminApiFetch<BackendCMSPage>(`/admin/content/pages/${id}`)
    return { ...mapPage(p), body: p.body, seoTitle: p.seoTitle ?? '', seoDescription: p.seoDescription ?? '' }
  } catch {
    return null
  }
}

export async function createPage(input: CMSPageInput): Promise<string> {
  const p = await adminApiFetch<{ _id: string }>('/admin/content/pages', { method: 'POST', body: input })
  return p._id
}

export async function updatePage(id: string, input: CMSPageInput): Promise<void> {
  await adminApiFetch(`/admin/content/pages/${id}`, { method: 'PATCH', body: input })
}

export async function deletePage(id: string): Promise<void> {
  await adminApiFetch(`/admin/content/pages/${id}`, { method: 'DELETE' })
}

// ─── Ingredients ────────────────────────────────────────────────────────────
// INGREDIENT_CATEGORIES/IngredientCategory live in lib/ingredientCategory.ts
// (a zero-dependency file) — re-exported here for server-side callers, but
// Client Components must import the real value from that file directly
// (see its own comment for why — same issue as lib/orderStatus.ts).
import type { IngredientCategory } from './ingredientCategory'
export type { IngredientCategory } from './ingredientCategory'
export { INGREDIENT_CATEGORIES } from './ingredientCategory'

interface BackendIngredient {
  _id: string
  slug: string
  name: string
  amount: string
  benefit: string
  description: string
  image?: string
  category: IngredientCategory
  clinicalBacking?: string
  isActive: boolean
  order:number
}

export interface IngredientRecord {
  id: string
  slug: string
  name: string
  amount: string
  benefit: string
  description: string
  image: string
  category: IngredientCategory
  clinicalBacking: string
  isActive: boolean
  order:number
}

export type IngredientInput = Omit<IngredientRecord, 'id' | 'slug' | 'order'> & { order?: number }

function mapIngredient(i: BackendIngredient): IngredientRecord {
  return {
    id: i._id, slug: i.slug, name: i.name, amount: i.amount, benefit: i.benefit,
    description: i.description, image: i.image ?? '', category: i.category,
    clinicalBacking: i.clinicalBacking ?? '', isActive: i.isActive, order:i.order??0,
  }
}

export async function listAdminIngredients(): Promise<IngredientRecord[]> {
  const raw = await adminApiFetch<BackendIngredient[]>('/admin/content/ingredients?limit=200')
  return raw.map(mapIngredient)
}

export async function getAdminIngredient(id: string): Promise<IngredientRecord | null> {
  try {
    return mapIngredient(await adminApiFetch<BackendIngredient>(`/admin/content/ingredients/${id}`))
  } catch {
    return null
  }
}

export async function createIngredient(input: IngredientInput): Promise<string> {
  const i = await adminApiFetch<{ _id: string }>('/admin/content/ingredients', { method: 'POST', body: input })
  return i._id
}

export async function updateIngredient(id: string, input: IngredientInput): Promise<void> {
  await adminApiFetch(`/admin/content/ingredients/${id}`, { method: 'PATCH', body: input })
}

export async function deleteIngredient(id: string): Promise<void> {
  await adminApiFetch(`/admin/content/ingredients/${id}`, { method: 'DELETE' })
}

// ─── Testimonials ───────────────────────────────────────────────────────────
interface BackendTestimonial {
  _id: string
  name: string
  title?: string
  type: 'expert' | 'customer'
  body: string
  rating?: number
  image?: string
  isActive: boolean
  order:number
}

export interface TestimonialRecord {
  id: string
  name: string
  title: string
  type: 'expert' | 'customer'
  body: string
  rating: number | undefined
  image: string
  isActive: boolean
  order:number
}

export type TestimonialInput = Omit<TestimonialRecord, 'id' | 'order'> & { order?: number }

function mapTestimonial(t: BackendTestimonial): TestimonialRecord {
  return {
    id: t._id, name: t.name, title: t.title ?? '', type: t.type, body: t.body,
    rating: t.rating, image: t.image ?? '', isActive: t.isActive, order:t.order??0,
  }
}

export async function listAdminTestimonials(): Promise<TestimonialRecord[]> {
  const raw = await adminApiFetch<BackendTestimonial[]>('/admin/content/testimonials?limit=200')
  return raw.map(mapTestimonial)
}

export async function getAdminTestimonial(id: string): Promise<TestimonialRecord | null> {
  try {
    return mapTestimonial(await adminApiFetch<BackendTestimonial>(`/admin/content/testimonials/${id}`))
  } catch {
    return null
  }
}

export async function createTestimonial(input: TestimonialInput): Promise<string> {
  const t = await adminApiFetch<{ _id: string }>('/admin/content/testimonials', { method: 'POST', body: input })
  return t._id
}

export async function updateTestimonial(id: string, input: TestimonialInput): Promise<void> {
  await adminApiFetch(`/admin/content/testimonials/${id}`, { method: 'PATCH', body: input })
}

export async function deleteTestimonial(id: string): Promise<void> {
  await adminApiFetch(`/admin/content/testimonials/${id}`, { method: 'DELETE' })
}

// ─── FAQs ───────────────────────────────────────────────────────────────────
interface BackendFAQ {
  _id: string
  question: string
  answer: string
  isActive: boolean
}

export interface FAQRecord {
  id: string
  question: string
  answer: string
  isActive: boolean
}

export type FAQInput = Omit<FAQRecord, 'id'>

function mapFAQ(f: BackendFAQ): FAQRecord {
  return { id: f._id, question: f.question, answer: f.answer, isActive: f.isActive }
}

export async function listAdminFAQs(): Promise<FAQRecord[]> {
  const raw = await adminApiFetch<BackendFAQ[]>('/admin/content/faqs?limit=200')
  return raw.map(mapFAQ)
}

export async function getAdminFAQ(id: string): Promise<FAQRecord | null> {
  try {
    return mapFAQ(await adminApiFetch<BackendFAQ>(`/admin/content/faqs/${id}`))
  } catch {
    return null
  }
}

export async function createFAQ(input: FAQInput): Promise<string> {
  const f = await adminApiFetch<{ _id: string }>('/admin/content/faqs', { method: 'POST', body: input })
  return f._id
}

export async function updateFAQ(id: string, input: FAQInput): Promise<void> {
  await adminApiFetch(`/admin/content/faqs/${id}`, { method: 'PATCH', body: input })
}

export async function deleteFAQ(id: string): Promise<void> {
  await adminApiFetch(`/admin/content/faqs/${id}`, { method: 'DELETE' })
}

export { AdminApiError }
