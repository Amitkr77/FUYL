import { apiFetch } from './client'
import type { Product, Collection } from '@/types/product'

export async function getProduct(slug: string): Promise<Product> {
  return apiFetch<Product>(`/products/${slug}`, {
    tags:       [`product-${slug}`],
    revalidate: 60,
  })
}

export async function getProducts(params?: {
  limit?:  number
  page?:   number
  sort?:   'price_asc' | 'price_desc' | 'newest'
}): Promise<Product[]> {
  const qs = new URLSearchParams()
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.page)  qs.set('page',  String(params.page))
  if (params?.sort)  qs.set('sort',  params.sort)

  return apiFetch<Product[]>(`/products?${qs.toString()}`, {
    tags:       ['products'],
    revalidate: 300,
  })
}

export async function getCollection(slug: string): Promise<Collection> {
  return apiFetch<Collection>(`/collections/${slug}`, {
    tags:       [`collection-${slug}`],
    revalidate: 300,
  })
}
