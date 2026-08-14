import { apiFetch } from './client'
import type {
  Product, ProductImage, ProductVariant, Collection,
  AdditionalPrice, ProductFAQ, Certification, SupplementInfo, ProductInfoBlock,
} from '@/types/product'

// ─── Backend raw shapes (subset of fields this file uses) ──────────────────
// Mirrors fuyl-backend/src/modules/catalog/models/*.ts. The backend returns
// its raw Mongoose documents, which don't match the frontend's Product/
// Collection contracts (different field names, embedded vs. separate
// collections, unresolved references) — these types describe what actually
// comes over the wire, and the mapXxx() functions below adapt it to the
// shape the rest of the app already expects.
interface BackendMedia {
  url: string
  alt?: string
}

interface BackendProduct {
  _id: string
  name: string
  description?: string
  shortDescription?: string
  media: BackendMedia[]
  seo: { slug: string; metaDescription?: string }
  basePrice: number
  salePrice?: number
  compareAtPrice?: number
  additionalPrices?: AdditionalPrice[]
  unitPrice?: { value: number; unit: string }
  // Physical-product logistics attributes (see catalog/models/product.model.ts
  // IProductShippingInfo) — doubles as the product-level net-content fallback
  // when a variant doesn't carry its own weight.
  shipping?: { weight?: number; weightUnit?: string }
  tagIds?: string[]
  isPublished: boolean
  isSubscribable: boolean
  ratingAverage: number
  ratingCount: number
  ingredients?: string[]
  benefits?: string[]
  faqs?: ProductFAQ[]
  certifications?: Certification[]
  supplementInfo?: SupplementInfo
  infoBlocks?: ProductInfoBlock[]
}

interface BackendVariant {
  _id: string
  sku: string
  name: string
  price: number
  salePrice?: number
  compareAtPrice?: number
  isActive: boolean
  weight?: number
  weightUnit?: string
}

interface BackendTag {
  _id: string
  name: string
}

interface BackendCollection {
  _id: string
  name: string
  slug: string
  description?: string
  imageUrl?: string
}

interface BackendReview {
  _id: string
  authorName: string
  rating: number
  body: string
  createdAt: string
  isVerifiedPurchase: boolean
}

interface BackendRatingSummary {
  average: number
  count: number
  distribution: Record<number, number>
}

export interface ReviewCard {
  id: string
  author: string
  rating: number
  date: string
  body: string
  verified: boolean
}

// basePrice/salePrice -> price/compareAtPrice, matching the same "sale price
// wins if set and > 0" rule the backend itself uses (pricing.repository.ts
// getEffectivePrice) for the legacy discount mechanism. An explicit
// compareAtPrice field (the newer, Shopify-style "Price + Compare-at Price"
// pair) takes precedence over the old basePrice-as-strikethrough inference
// when both are present, since it's what an admin deliberately set.
function effectivePrice(basePrice: number, salePrice?: number, explicitCompareAt?: number): { price: number; compareAtPrice?: number } {
  if (salePrice && salePrice > 0) {
    return { price: salePrice, compareAtPrice: explicitCompareAt ?? basePrice }
  }
  return { price: basePrice, compareAtPrice: explicitCompareAt }
}

// Backend media items carry no width/height (no image-dimension field on the
// model) — fall back to the same 800x800 assumption already used by this
// file's FALLBACK_PRODUCT-style placeholders elsewhere in the app.
function mapImages(media: BackendMedia[]): ProductImage[] {
  return media.map((m, i) => ({
    id:      String(i),
    url:     m.url,
    altText: m.alt ?? '',
    width:   800,
    height:  800,
  }))
}

function mapVariant(v: BackendVariant, available = v.isActive): ProductVariant {
  const { price, compareAtPrice } = effectivePrice(v.price, v.salePrice, v.compareAtPrice)
  return {
    id: v._id,
    title: v.name,
    price,
    compareAtPrice,
    available,
    sku: v.sku,
    weight: v.weight,
    weightUnit: v.weightUnit,
  }
}

async function mapVariantsWithStock(productId: string, variants: BackendVariant[]): Promise<ProductVariant[]> {
  return Promise.all(variants.map(async (variant) => {
    const stock = await getProductStock(productId, variant._id)
    // No inventory row means inventory is not being tracked for this variant;
    // otherwise zero available stock must make the option unavailable.
    return mapVariant(variant, variant.isActive && (stock === null || stock > 0))
  }))
}

async function getTagNames(tagIds?: string[]): Promise<string[]> {
  if (!tagIds?.length) return []
  const allTags = await apiFetch<BackendTag[]>('/catalog/tags', {
    tags:       ['catalog-tags'],
    revalidate: 3600,
  })
  const byId = new Map(allTags.map((t) => [t._id, t.name]))
  return tagIds.map((id) => byId.get(id)).filter((name): name is string => Boolean(name))
}

function mapProduct(raw: BackendProduct, variants: ProductVariant[], tags: string[]): Product {
  const { price, compareAtPrice } = effectivePrice(raw.basePrice, raw.salePrice, raw.compareAtPrice)

  // Variants are optional on the backend (admin/products can be created with
  // none — see catalog/models/product.model.ts) — every consumer of `Product`
  // (ProductCard, ProductInfo, AddToCartButton, WishlistButton, etc.) reads
  // pricing/availability off `variants[0]`, so a product with zero real
  // variants needs a stand-in "virtual" variant built from its own
  // price/compareAtPrice/isPublished. Its `id` is deliberately '' (not a real
  // Variant document) — every call site that forwards a variant id to an API
  // normalizes falsy ids to `undefined` so this never gets sent as a fake
  // variantId.
  const effectiveVariants: ProductVariant[] = variants.length
    ? variants
    : [{
        id: '',
        title: raw.name,
        price,
        compareAtPrice,
        available: raw.isPublished,
        sku: '',
        weight: raw.shipping?.weight,
        weightUnit: raw.shipping?.weightUnit,
      }]

  return {
    id:             raw._id,
    slug:           raw.seo.slug,
    name:           raw.name,
    title:          raw.name,
    description:    raw.description ?? '',
    shortDescription: raw.shortDescription,
    seoDescription: raw.seo.metaDescription ?? '',
    price,
    compareAtPrice,
    additionalPrices: raw.additionalPrices ?? [],
    unitPrice:        raw.unitPrice,
    weight:           raw.shipping?.weight,
    weightUnit:       raw.shipping?.weightUnit,
    images:         mapImages(raw.media),
    variants:       effectiveVariants,
    tags,
    available:      raw.isPublished,
    isSubscribable: raw.isSubscribable,
    rating:         raw.ratingAverage,
    reviewCount:    raw.ratingCount,
    ingredients:    raw.ingredients ?? [],
    benefits:       raw.benefits ?? [],
    faqs:           raw.faqs ?? [],
    certifications: raw.certifications ?? [],
    supplementInfo: raw.supplementInfo ?? {},
    infoBlocks:     raw.infoBlocks ?? [],
  }
}

// Collections have no product-resolution mechanism on the backend today
// (Collection.rules[] is stored but no engine evaluates it, and the product
// list endpoint has no collectionId filter) — products is always empty until
// that backend capability exists. Explicit here rather than left undefined,
// so CollectionGrid's existing empty-state fallback keeps working correctly.
function mapCollection(raw: BackendCollection): Collection {
  return {
    id:          raw._id,
    slug:        raw.slug,
    title:       raw.name,
    description: raw.description ?? '',
    image:       raw.imageUrl
      ? { id: 'cover', url: raw.imageUrl, altText: raw.name, width: 1200, height: 630 }
      : undefined,
    products:    [],
  }
}

export async function getProduct(slug: string): Promise<Product> {
  const raw = await apiFetch<BackendProduct>(`/catalog/products/slug/${slug}`, {
    tags:       [`product-${slug}`],
    revalidate: 60,
  })

  const [variants, tags] = await Promise.all([
    apiFetch<BackendVariant[]>(`/catalog/products/${raw._id}/variants`, {
      tags:       [`product-${slug}-variants`],
      revalidate: 60,
    }),
    getTagNames(raw.tagIds),
  ])

  return mapProduct(raw, await mapVariantsWithStock(raw._id, variants), tags)
}

// Used by the wishlist page, which only stores a productId (no slug) per
// entry. `revalidate: 60` matches getProduct(slug)'s own window — this is
// the same underlying product, just looked up a different way.
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const raw = await apiFetch<BackendProduct>(`/catalog/products/${id}`, {
      tags:       [`product-id-${id}`],
      revalidate: 60,
    })
    const [variants, tags] = await Promise.all([
      apiFetch<BackendVariant[]>(`/catalog/products/${raw._id}/variants`, {
        tags:       [`product-${raw.seo.slug}-variants`],
        revalidate: 60,
      }),
      getTagNames(raw.tagIds),
    ])
    return mapProduct(raw, await mapVariantsWithStock(raw._id, variants), tags)
  } catch {
    return null
  }
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

  // Note: the backend's GET /catalog/products does not currently read a
  // `sort` query param (always orders by createdAt desc) — this is sent
  // but silently has no effect until the backend adds sort support.
  const items = await apiFetch<BackendProduct[]>(`/catalog/products?${qs.toString()}`, {
    tags:       ['products'],
    revalidate: 300,
  })

  // Fetch variants for each product so ProductCard has real variant IDs.
  // Without this, Add to Cart sends variantId:undefined, the backend looks for
  // product-level stock (variantId:{$exists:false}), finds nothing when stock
  // is tracked per-variant, and throws "0 units available".
  // We use mapVariant (isActive-based availability) rather than mapVariantsWithStock
  // to avoid an extra stock-check per variant — the backend re-validates at cart-add time.
  return Promise.all(items.map(async (raw) => {
    try {
      const variants = await apiFetch<BackendVariant[]>(`/catalog/products/${raw._id}/variants`, {
        tags:       [`product-${raw.seo.slug}-variants`],
        revalidate: 300,
      })
      return mapProduct(raw, variants.map((v) => mapVariant(v)), [])
    } catch {
      return mapProduct(raw, [], [])
    }
  }))
}

// Full-text product search (backend GET /catalog/products/search?q=). Like
// getProducts, list items map without variants/tags to avoid an N+1 — search
// result cards read price/compareAtPrice off the mapped product directly.
export async function searchProducts(query: string, limit = 6): Promise<Product[]> {
  const q = query.trim()
  if (!q) return []
  const qs = new URLSearchParams({ q, limit: String(limit) })
  try {
    const items = await apiFetch<BackendProduct[]>(`/catalog/products/search?${qs.toString()}`, {
      cache: 'no-store',
    })
    return items.map((raw) => mapProduct(raw, [], []))
  } catch {
    return []
  }
}

function mapReview(r: BackendReview): ReviewCard {
  return {
    id:       r._id,
    author:   r.authorName,
    rating:   r.rating,
    date:     new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    body:     r.body,
    verified: r.isVerifiedPurchase,
  }
}

export async function getProductReviews(productId: string): Promise<{
  reviews:       ReviewCard[]
  averageRating: number
  totalCount:    number
}> {
  const [items, summary] = await Promise.all([
    apiFetch<BackendReview[]>(`/reviews/product/${productId}?limit=6`, {
      tags:       [`product-${productId}-reviews`],
      revalidate: 300,
    }),
    apiFetch<BackendRatingSummary>(`/reviews/product/${productId}/summary`, {
      tags:       [`product-${productId}-reviews`],
      revalidate: 300,
    }),
  ])
  return {
    reviews:       items.map(mapReview),
    averageRating: summary.average,
    totalCount:    summary.count,
  }
}

interface BackendStockRow {
  available: number
  onHand: number
  reserved: number
  variantId?: string
}

/**
 * Returns the total available quantity for a product (optionally a specific
 * variant), summed across all warehouses. Returns null if the product has
 * no inventory record yet. The cart treats that as unavailable until stock
 * is explicitly configured by an admin.
 */
export async function getProductStock(productId: string, variantId?: string): Promise<number | null> {
  try {
    const qs = variantId ? `?variantId=${variantId}` : ''
    const rows = await apiFetch<BackendStockRow[]>(`/inventory/stock/${productId}${qs}`, {
      cache: 'no-store',
    })
    if (!rows.length) return null
    return rows.reduce((sum, r) => sum + r.available, 0)
  } catch {
    return null
  }
}

export async function getCollection(slug: string): Promise<Collection> {
  const raw = await apiFetch<BackendCollection>(`/catalog/collections/slug/${slug}`, {
    tags:       [`collection-${slug}`],
    revalidate: 300,
  })
  return mapCollection(raw)
}
