import { adminApiFetch, AdminApiError } from './api'
import { getSession } from './auth'

// ─── Backend raw shapes (subset of fields this file uses) ──────────────────
// Mirrors fuyl-backend's catalog/inventory models. The backend splits what
// this admin UI treats as one "product" across three collections — Product
// (name/description/pricing/metafields), Variant (sku/price/attributes, a
// product can have several), and InventoryStock (onHand, per
// product+variant+warehouse).

export type ProductStatus = 'active' | 'draft' | 'archived'

export interface AdditionalPrice {
  label: string
  price: number
}

export interface FAQEntry {
  question: string
  answer: string
}

export interface CertificationEntry {
  label: string
  logoUrl: string
}

export interface SupplementInfo {
  ageGroup?: string
  dietaryUse?: string
  flavor?: string
  ingredientCategory?: string
  routeOfAdministration?: string
  healthFocus?: string[]
}

export interface AdminVariant {
  id: string              // '' for a row not yet created on the backend
  sku: string
  name: string
  attributes: Record<string, string>   // e.g. {size:'500g', flavor:'berry'}
  price: number
  compareAtPrice?: number
  stock: number
  images: string[]
  weight?: number
}

export interface AdminProduct {
  id:          string
  name:        string
  // Table/list convenience fields — first variant's sku, summed stock across
  // all variants. ProductsTable.tsx reads these directly.
  sku:         string
  stock:       number
  status:      ProductStatus
  // Gates storefront visibility — the public catalog query filters on this
  // (not `status`).
  isPublished:   boolean
  // Gates whether the PDP's Subscribe & Save purchase option can appear at
  // all for this product — defaults false on the backend, and nothing sent
  // it before this field existed here, so no product could ever be marked
  // subscribable through the admin.
  isSubscribable: boolean
  category:    string   // name, for display
  categoryId:  string   // id, for the form's <select>
  description: string
  imageUrl:    string   // first image, '' if none — kept for list/table thumbnails
  images:      string[] // full gallery, in display order; images[0] is the cover/primary image
  // Pricing
  price:            number
  compareAtPrice?:  number
  additionalPrices: AdditionalPrice[]
  unitPriceValue?:  number
  unitPriceUnit?:   string
  isTaxable:        boolean
  costPerItem?:     number
  profit?:          number   // computed by the backend, only present for a privileged (admin) requester
  margin?:          number
  // Metafields
  benefits:       string[]
  faqs:           FAQEntry[]
  certifications: CertificationEntry[]
  supplementInfo: SupplementInfo
  // Variants
  variants: AdminVariant[]
}

export interface Category {
  id:   string
  name: string
}

export interface AttributeDef {
  slug: string
  name: string
}

export interface AdminProductInput {
  name:        string
  categoryId:  string
  description: string
  status:      ProductStatus
  isPublished:    boolean
  isSubscribable: boolean
  images:      string[]
  price:            number
  compareAtPrice?:  number
  additionalPrices: AdditionalPrice[]
  unitPriceValue?:  number
  unitPriceUnit?:   string
  isTaxable:        boolean
  costPerItem?:     number
  benefits:       string[]
  faqs:           FAQEntry[]
  certifications: CertificationEntry[]
  supplementInfo: SupplementInfo
  variants: AdminVariant[]
}

interface BackendMedia { url: string; position?: number }
interface BackendProduct {
  _id: string
  name: string
  description?: string
  basePrice: number
  compareAtPrice?: number
  additionalPrices?: AdditionalPrice[]
  unitPrice?: { value: number; unit: string }
  isTaxable: boolean
  costPerItem?: number
  profit?: number
  margin?: number
  benefits?: string[]
  faqs?: FAQEntry[]
  certifications?: CertificationEntry[]
  supplementInfo?: SupplementInfo
  categoryIds?: string[]
  status: ProductStatus
  isPublished: boolean
  isSubscribable: boolean
  media: BackendMedia[]
}
interface BackendVariant {
  _id: string
  sku: string
  name: string
  attributes?: Record<string, string | number | boolean>
  price: number
  compareAtPrice?: number
  weight?: number
  media?: BackendMedia[]
  isActive: boolean
}
interface BackendCategory {
  _id: string
  name: string
}
interface BackendStock {
  productId: string
  variantId?: string
  onHand: number
}

// Media has no guaranteed array order from the backend — position is the
// source of truth for display order, falling back to array order for older
// records saved before `position` was set on every item.
function sortMedia(media: BackendMedia[] | undefined): BackendMedia[] {
  if (!media) return []
  return [...media].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
}

// images[0] is always the cover — mirrored to isPrimary for the backend,
// which the storefront's primary-image lookups (e.g. cart line items) key off.
function toMedia(images: string[]) {
  return images.map((url, position) => ({ url, type: 'image', isPrimary: position === 0, position }))
}

function mapVariant(v: BackendVariant, stockByVariant: Map<string, number>): AdminVariant {
  const attrs: Record<string, string> = {}
  for (const [k, val] of Object.entries(v.attributes ?? {})) attrs[k] = String(val)
  return {
    id: v._id,
    sku: v.sku,
    name: v.name,
    attributes: attrs,
    price: v.price,
    compareAtPrice: v.compareAtPrice,
    stock: stockByVariant.get(v._id) ?? 0,
    images: sortMedia(v.media).map((m) => m.url),
    weight: v.weight,
  }
}

function slugify(name: string): string {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  // seo.slug is unique on the backend — a name collision would otherwise 409.
  return `${base || 'product'}-${Date.now().toString(36)}`
}

async function requireSellerId(): Promise<string> {
  const session = await getSession()
  if (!session) throw new AdminApiError(401, 'Not signed in')
  return session.userId
}

// Reconciles a variant's stock to an absolute target quantity — the form
// collects "how many do we have," but the backend's /inventory/adjust only
// accepts a relative delta.
async function reconcileStock(productId: string, variantId: string, sellerId: string, targetStock: number) {
  const stockRows = await adminApiFetch<BackendStock[]>(`/inventory/stock/${productId}?variantId=${variantId}`).catch(() => [] as BackendStock[])
  const currentOnHand = stockRows.reduce((sum, r) => sum + r.onHand, 0)
  const delta = targetStock - currentOnHand
  if (delta !== 0) {
    await adminApiFetch('/inventory/adjust', {
      method: 'POST',
      body: { productId, variantId, sellerId, delta, type: delta > 0 ? 'adjustment_in' : 'adjustment_out' },
    })
  }
}

function productBody(input: AdminProductInput) {
  return {
    name:              input.name,
    description:       input.description,
    categoryIds:       input.categoryId ? [input.categoryId] : [],
    basePrice:         input.price,
    compareAtPrice:    input.compareAtPrice,
    additionalPrices:  input.additionalPrices,
    unitPrice:         input.unitPriceValue != null && input.unitPriceUnit
      ? { value: input.unitPriceValue, unit: input.unitPriceUnit }
      : undefined,
    isTaxable:         input.isTaxable,
    costPerItem:       input.costPerItem,
    benefits:          input.benefits,
    faqs:              input.faqs,
    certifications:    input.certifications,
    supplementInfo:    input.supplementInfo,
    status:            input.status,
    isPublished:       input.isPublished,
    isSubscribable:    input.isSubscribable,
    media:             toMedia(input.images),
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const raw = await adminApiFetch<BackendCategory[]>('/catalog/categories')
    return raw.map((c) => ({ id: c._id, name: c.name }))
  } catch {
    return []
  }
}

// Powers the variant-attribute editor's suggestions (Size/Flavor/Pack
// Size/Color/etc) — admins can still type a new attribute key freely, this
// just offers the ones already defined elsewhere in the catalog.
export async function getAttributes(): Promise<AttributeDef[]> {
  try {
    const raw = await adminApiFetch<{ slug: string; name: string }[]>('/catalog/attributes')
    return raw.map((a) => ({ slug: a.slug, name: a.name }))
  } catch {
    return []
  }
}

// Admin catalog list, page-bounded (no pagination UI yet — see the audit's
// hardening task for that). For each product this also fetches its
// variants — an N+1 pattern, acceptable at this catalog's scale but worth
// revisiting if the product count grows significantly.
export async function listAdminProducts(): Promise<AdminProduct[]> {
  const sellerId = await requireSellerId()

  const [products, stockRows, categories] = await Promise.all([
    adminApiFetch<BackendProduct[]>('/admin/catalog/products?limit=50'),
    adminApiFetch<BackendStock[]>(`/inventory/mine?sellerId=${sellerId}&limit=200`).catch(() => [] as BackendStock[]),
    getCategories(),
  ])

  const stockByVariant = new Map<string, number>()
  for (const s of stockRows) {
    if (!s.variantId) continue
    stockByVariant.set(s.variantId, (stockByVariant.get(s.variantId) ?? 0) + s.onHand)
  }
  const categoryName = new Map(categories.map((c) => [c.id, c.name]))

  const variantsByProduct = await Promise.all(
    products.map((p) => adminApiFetch<BackendVariant[]>(`/catalog/products/${p._id}/variants`).catch(() => [] as BackendVariant[]))
  )

  return products.map((p, i) => {
    const variants = variantsByProduct[i].map((v) => mapVariant(v, stockByVariant))
    const categoryId = p.categoryIds?.[0] ?? ''
    const images = sortMedia(p.media).map((m) => m.url)
    return {
      id:          p._id,
      name:        p.name,
      sku:         variants[0]?.sku ?? '—',
      stock:       variants.reduce((sum, v) => sum + v.stock, 0),
      status:      p.status,
      isPublished:    p.isPublished,
      isSubscribable: p.isSubscribable,
      category:    categoryId ? (categoryName.get(categoryId) ?? '—') : '—',
      categoryId,
      description: p.description ?? '',
      imageUrl:    images[0] ?? '',
      images,
      price:            p.basePrice,
      compareAtPrice:   p.compareAtPrice,
      additionalPrices: p.additionalPrices ?? [],
      unitPriceValue:   p.unitPrice?.value,
      unitPriceUnit:    p.unitPrice?.unit,
      isTaxable:        p.isTaxable,
      costPerItem:      p.costPerItem,
      profit:           p.profit,
      margin:           p.margin,
      benefits:         p.benefits ?? [],
      faqs:             p.faqs ?? [],
      certifications:   p.certifications ?? [],
      supplementInfo:   p.supplementInfo ?? {},
      variants,
    }
  })
}

export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  try {
    const [product, rawVariants, categories] = await Promise.all([
      adminApiFetch<BackendProduct>(`/catalog/products/${id}`),
      adminApiFetch<BackendVariant[]>(`/catalog/products/${id}/variants`).catch(() => [] as BackendVariant[]),
      getCategories(),
    ])

    const stockRows = await adminApiFetch<BackendStock[]>(`/inventory/stock/${id}`).catch(() => [] as BackendStock[])
    const stockByVariant = new Map<string, number>()
    for (const s of stockRows) {
      if (!s.variantId) continue
      stockByVariant.set(s.variantId, (stockByVariant.get(s.variantId) ?? 0) + s.onHand)
    }

    const variants = rawVariants.map((v) => mapVariant(v, stockByVariant))
    const categoryName = new Map(categories.map((c) => [c.id, c.name]))
    const categoryId = product.categoryIds?.[0] ?? ''
    const images = sortMedia(product.media).map((m) => m.url)

    return {
      id:          product._id,
      name:        product.name,
      sku:         variants[0]?.sku ?? '',
      stock:       variants.reduce((sum, v) => sum + v.stock, 0),
      status:      product.status,
      isPublished:    product.isPublished,
      isSubscribable: product.isSubscribable,
      category:    categoryId ? (categoryName.get(categoryId) ?? '') : '',
      categoryId,
      description: product.description ?? '',
      imageUrl:    images[0] ?? '',
      images,
      price:            product.basePrice,
      compareAtPrice:   product.compareAtPrice,
      additionalPrices: product.additionalPrices ?? [],
      unitPriceValue:   product.unitPrice?.value,
      unitPriceUnit:    product.unitPrice?.unit,
      isTaxable:        product.isTaxable,
      costPerItem:      product.costPerItem,
      profit:           product.profit,
      margin:           product.margin,
      benefits:         product.benefits ?? [],
      faqs:             product.faqs ?? [],
      certifications:   product.certifications ?? [],
      supplementInfo:   product.supplementInfo ?? {},
      variants,
    }
  } catch {
    return null
  }
}

export async function createAdminProduct(input: AdminProductInput): Promise<string> {
  const sellerId = await requireSellerId()

  const product = await adminApiFetch<{ _id: string }>('/admin/catalog/products', {
    method: 'POST',
    body: { ...productBody(input), sellerId, seo: { slug: slugify(input.name) } },
  })

  for (const variant of input.variants) {
    const created = await adminApiFetch<{ _id: string }>('/admin/catalog/variants', {
      method: 'POST',
      body: {
        productId:      product._id,
        sku:            variant.sku,
        name:           variant.name,
        attributes:     variant.attributes,
        price:          variant.price,
        compareAtPrice: variant.compareAtPrice,
        weight:         variant.weight,
        media:          toMedia(variant.images),
      },
    })
    if (variant.stock > 0) {
      await reconcileStock(product._id, created._id, sellerId, variant.stock)
    }
  }

  return product._id
}

export async function updateAdminProduct(id: string, input: AdminProductInput): Promise<void> {
  const sellerId = await requireSellerId()

  await adminApiFetch(`/admin/catalog/products/${id}`, {
    method: 'PATCH',
    body: productBody(input),
  })

  // Reconcile variants: rows with an id get updated, rows without one are
  // new and get created, and any variant that existed before but is no
  // longer present in the form gets deactivated (soft-delete — the backend
  // has no hard variant delete).
  const existing = await adminApiFetch<BackendVariant[]>(`/catalog/products/${id}/variants`).catch(() => [] as BackendVariant[])
  const keptIds = new Set(input.variants.filter((v) => v.id).map((v) => v.id))

  for (const variant of input.variants) {
    if (variant.id) {
      await adminApiFetch(`/admin/catalog/variants/${variant.id}`, {
        method: 'PATCH',
        body: {
          sku:            variant.sku,
          name:           variant.name,
          attributes:     variant.attributes,
          price:          variant.price,
          compareAtPrice: variant.compareAtPrice,
          weight:         variant.weight,
          media:          toMedia(variant.images),
        },
      })
      await reconcileStock(id, variant.id, sellerId, variant.stock)
    } else {
      const created = await adminApiFetch<{ _id: string }>('/admin/catalog/variants', {
        method: 'POST',
        body: {
          productId:      id,
          sku:            variant.sku,
          name:           variant.name,
          attributes:     variant.attributes,
          price:          variant.price,
          compareAtPrice: variant.compareAtPrice,
          weight:         variant.weight,
          media:          toMedia(variant.images),
        },
      })
      if (variant.stock > 0) {
        await reconcileStock(id, created._id, sellerId, variant.stock)
      }
    }
  }

  for (const old of existing) {
    if (!keptIds.has(old._id)) {
      await adminApiFetch(`/admin/catalog/variants/${old._id}`, { method: 'DELETE' })
    }
  }
}

export async function archiveAdminProduct(id: string): Promise<void> {
  await adminApiFetch(`/admin/catalog/products/${id}`, { method: 'DELETE' })
}
