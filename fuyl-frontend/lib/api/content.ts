import { apiFetch } from './client'
import type { CMSPage, BlogPost, Ingredient, Testimonial, FAQ } from '@/types/content'

export async function getPage(slug: string): Promise<CMSPage> {
  return apiFetch<CMSPage>(`/pages/${slug}`, {
    tags:       [`page-${slug}`],
    revalidate: 3600,
  })
}

export async function getPosts(params?: { limit?: number; tag?: string }): Promise<BlogPost[]> {
  const qs = new URLSearchParams()
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.tag)   qs.set('tag',   params.tag)
  return apiFetch<BlogPost[]>(`/posts?${qs.toString()}`, {
    tags:       ['posts'],
    revalidate: 1800,
  })
}

export async function getPost(slug: string): Promise<BlogPost> {
  return apiFetch<BlogPost>(`/posts/${slug}`, {
    tags:       [`post-${slug}`],
    revalidate: 1800,
  })
}

export async function getIngredients(): Promise<Ingredient[]> {
  return apiFetch<Ingredient[]>('/ingredients', {
    tags:       ['ingredients'],
    revalidate: false, // static — almost never changes
  })
}

export async function getTestimonials(type?: 'expert' | 'customer'): Promise<Testimonial[]> {
  const qs = type ? `?type=${type}` : ''
  return apiFetch<Testimonial[]>(`/testimonials${qs}`, {
    tags:       ['testimonials'],
    revalidate: 3600,
  })
}

export async function getFAQs(): Promise<FAQ[]> {
  return apiFetch<FAQ[]>('/faqs', {
    tags:       ['faqs'],
    revalidate: false,
  })
}

export async function subscribeNewsletter(email: string): Promise<void> {
  return apiFetch('/newsletter/subscribe', {
    method: 'POST',
    body:   { email },
  })
}
