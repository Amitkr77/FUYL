import { apiFetch } from './client'
import type { CMSPage, BlogPost, Ingredient, Testimonial, FAQ, InstagramPost } from '@/types/content'

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
    revalidate: false, // static — almost never changes
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
export async function getInstagramPosts(limit = 6): Promise<InstagramPost[]> {
  try {
    return await apiFetch<InstagramPost[]>(`/instagram?limit=${limit}`, {
      tags:       ['instagram'],
      revalidate: 3600,
    })
  } catch {
    return []
  }
}

export async function subscribeNewsletter(email: string): Promise<void> {
  return apiFetch('/newsletter/subscribe', {
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
