import { adminApiFetch, AdminApiError } from './api'
import { getSession } from './auth'
import { getTags, resolveTagIds } from './tags'

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

export interface ProductInfoBlock {
  image?: string
  title?: string
  description: string
}

export type WeightUnit = 'g' | 'kg' | 'lb' | 'oz'

export type ShippingMode = 'calculated' | 'fixed' | 'free'

export interface ShippingInfo {
  isPhysical: boolean
  packageType?: string
  weight?: number
  weightUnit: WeightUnit
  length?: number
  width?: number
  height?: number
  countryOfOrigin?: string
  hsCode?: string
  shippingMode?: ShippingMode
  fixedShippingRate?: number
}

const DEFAULT_SHIPPING: ShippingInfo = { isPhysical: true, weightUnit: 'g' }

export interface SeoInfo {
  slug: string
  metaTitle?: string
  metaDescription?: string
}

const DEFAULT_SEO: SeoInfo = { slug: '' }

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
  brand?:      string
  // Tag names (resolved from tagIds) — see lib/tags.ts. The form edits these
  // as free-typed names; saving resolves/creates Tag documents from them.
  tags:        string[]
  // Short summary shown on product cards/listings/previews — distinct from
  // the full `description` below.
  shortDescription: string
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
  taxRate?:         number
  costPerItem?:     number
  profit?:          number   // computed by the backend, only present for a privileged (admin) requester
  margin?:          number
  // Metafields
  ingredients:    string[]
  benefits:       string[]
  faqs:           FAQEntry[]
  certifications: CertificationEntry[]
  supplementInfo: SupplementInfo
  // URL slug + meta title/description — editable so a new product's slug
  // isn't stuck with the auto-generated suggestion forever.
  seo: SeoInfo
  // Repeatable image+title+description content blocks (Product Details section).
  infoBlocks: ProductInfoBlock[]
  // Shipping/customs — lives on the product itself since variants are optional.
  shipping: ShippingInfo
  // Variants — optional; a product with none is sold at the price above.
  variants: AdminVariant[]
}

export interface AttributeDef {
  slug: string
  name: string
}

export interface AdminProductInput {
  name:        string
  brand?:      string
  tags:        string[]
  shortDescription: string
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
  taxRate?:         number
  costPerItem?:     number
  ingredients:    string[]
  benefits:       string[]
  faqs:           FAQEntry[]
  certifications: CertificationEntry[]
  supplementInfo: SupplementInfo
  infoBlocks: ProductInfoBlock[]
  shipping: ShippingInfo
  seo: SeoInfo
  // Only used when `variants` is empty — stock tracked directly against the
  // product itself (InventoryStock with no variantId) instead of per-variant.
  stock: number
  variants: AdminVariant[]
}

interface BackendMedia { url: string; position?: number }
interface BackendProduct {
  _id: string
  name: string
  brand?: string
  shortDescription?: string
  description?: string
  basePrice: number
  compareAtPrice?: number
  additionalPrices?: AdditionalPrice[]
  unitPrice?: { value: number; unit: string }
  isTaxable: boolean
  taxRate?: number
  costPerItem?: number
  profit?: number
  margin?: number
  ingredients?: string[]
  benefits?: string[]
  faqs?: FAQEntry[]
  certifications?: CertificationEntry[]
  supplementInfo?: SupplementInfo
  infoBlocks?: ProductInfoBlock[]
  shippingInfo?: ShippingInfo
  seo?: SeoInfo
  tagIds?: string[]
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

// A clean, human-readable slug from the product name — no random/timestamp
// suffix. seo.slug is unique on the backend, so a genuine name collision
// surfaces as a 409 the admin resolves by editing the Slug field directly
// (see the SEO section in ProductForm), rather than being papered over with
// an ugly auto-appended suffix on every product.
export function slugify(name: string): string {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return base || 'product'
}

async function requireSellerId(): Promise<string> {
  const session = await getSession()
  if (!session) throw new AdminApiError(401, 'Not signed in')
  return session.userId
}

// Reconciles a variant's (or, when variantId is omitted, the product's own —
// see catalog/models/product.model.ts on why variants are optional) stock to
// an absolute target quantity. The form collects "how many do we have," but
// the backend's /inventory/adjust only accepts a relative delta.
//
// Omitting variantId here (no key sent, not `variantId: undefined`) matters:
// the backend's stockRepo.findOrCreate() distinguishes "no variant" via
// `{ $exists: false }` — sending the literal string "undefined" would break
// that lookup and silently create/adjust the wrong stock row.
async function reconcileStock(productId: string, variantId: string | undefined, sellerId: string, targetStock: number) {
  const qs = variantId ? `?variantId=${variantId}` : ''
  const stockRows = await adminApiFetch<BackendStock[]>(`/inventory/stock/${productId}${qs}`).catch(() => [] as BackendStock[])
  const currentOnHand = stockRows
    .filter((r) => (variantId ? r.variantId === variantId : !r.variantId))
    .reduce((sum, r) => sum + r.onHand, 0)
  const delta = targetStock - currentOnHand
  // A zero-stock product still needs a persisted inventory row so it appears
  // in Inventory and can be assigned to a location later.
  if (delta !== 0 || stockRows.length === 0) {
    await adminApiFetch('/inventory/adjust', {
      method: 'POST',
      body: { productId, ...(variantId ? { variantId } : {}), sellerId, delta, type: delta > 0 ? 'adjustment_in' : 'adjustment_out' },
    })
  }
}

function productBody(input: AdminProductInput) {
  return {
    name:              input.name,
    brand:             input.brand || undefined,
    shortDescription:  input.shortDescription || undefined,
    description:       input.description,
    basePrice:         input.price,
    compareAtPrice:    input.compareAtPrice,
    additionalPrices:  input.additionalPrices,
    unitPrice:         input.unitPriceValue != null && input.unitPriceUnit
      ? { value: input.unitPriceValue, unit: input.unitPriceUnit }
      : undefined,
    isTaxable:         input.isTaxable,
    taxRate:           input.taxRate,
    costPerItem:       input.costPerItem,
    ingredients:       input.ingredients,
    benefits:          input.benefits,
    faqs:              input.faqs,
    certifications:    input.certifications,
    supplementInfo:    input.supplementInfo,
    infoBlocks:        input.infoBlocks,
    shippingInfo:       input.shipping,
    seo: {
      // Fall back to a fresh slug if the admin cleared the field entirely —
      // the backend rejects an empty seo.slug outright.
      slug:            input.seo.slug.trim() || slugify(input.name),
      metaTitle:       input.seo.metaTitle || undefined,
      metaDescription: input.seo.metaDescription || undefined,
    },
    status:            input.status,
    isPublished:       input.isPublished,
    isSubscribable:    input.isSubscribable,
    media:             toMedia(input.images),
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

  const [products, stockRows, tags] = await Promise.all([
    adminApiFetch<BackendProduct[]>('/admin/catalog/products?limit=200'),
    adminApiFetch<BackendStock[]>(`/inventory/mine?sellerId=${sellerId}&limit=200`).catch(() => [] as BackendStock[]),
    getTags(),
  ])
  const tagNameById = new Map(tags.map((t) => [t.id, t.name]))

  const stockByVariant = new Map<string, number>()
  // Rows with no variantId are stock tracked directly against a product that
  // has no variants (see reconcileStock) — previously skipped entirely here,
  // which is why a variant-less product always showed 0/"Out of stock"
  // regardless of what was actually adjusted for it.
  const stockByProduct = new Map<string, number>()
  for (const s of stockRows) {
    if (s.variantId) {
      stockByVariant.set(s.variantId, (stockByVariant.get(s.variantId) ?? 0) + s.onHand)
    } else {
      stockByProduct.set(s.productId, (stockByProduct.get(s.productId) ?? 0) + s.onHand)
    }
  }
  const variantsByProduct = await Promise.all(
    products.map((p) => adminApiFetch<BackendVariant[]>(`/catalog/products/${p._id}/variants`).catch(() => [] as BackendVariant[]))
  )

  return products.map((p, i) => {
    const variants = variantsByProduct[i].map((v) => mapVariant(v, stockByVariant))
    const images = sortMedia(p.media).map((m) => m.url)
    const stock = variants.length > 0
      ? variants.reduce((sum, v) => sum + v.stock, 0)
      : (stockByProduct.get(p._id) ?? 0)
    return {
      id:          p._id,
      name:        p.name,
      sku:         variants[0]?.sku ?? '—',
      stock,
      status:      p.status,
      isPublished:    p.isPublished,
      isSubscribable: p.isSubscribable,
      brand:       p.brand,
      tags:        (p.tagIds ?? []).map((id) => tagNameById.get(id)).filter((n): n is string => Boolean(n)),
      shortDescription: p.shortDescription ?? '',
      description: p.description ?? '',
      imageUrl:    images[0] ?? '',
      images,
      price:            p.basePrice,
      compareAtPrice:   p.compareAtPrice,
      additionalPrices: p.additionalPrices ?? [],
      unitPriceValue:   p.unitPrice?.value,
      unitPriceUnit:    p.unitPrice?.unit,
      isTaxable:        p.isTaxable,
      taxRate:          p.taxRate,
      costPerItem:      p.costPerItem,
      profit:           p.profit,
      margin:           p.margin,
      ingredients:      p.ingredients ?? [],
      benefits:         p.benefits ?? [],
      faqs:             p.faqs ?? [],
      certifications:   p.certifications ?? [],
      supplementInfo:   p.supplementInfo ?? {},
      infoBlocks:       p.infoBlocks ?? [],
      shipping:         p.shippingInfo ?? DEFAULT_SHIPPING,
      seo:              p.seo ?? DEFAULT_SEO,
      variants,
    }
  })
}

export async function getAdminProduct(id: string): Promise<AdminProduct | null> {
  try {
    const [product, rawVariants, tags] = await Promise.all([
      adminApiFetch<BackendProduct>(`/catalog/products/${id}`),
      adminApiFetch<BackendVariant[]>(`/catalog/products/${id}/variants`).catch(() => [] as BackendVariant[]),
      getTags(),
    ])
    const tagNameById = new Map(tags.map((t) => [t.id, t.name]))

    const stockRows = await adminApiFetch<BackendStock[]>(`/inventory/stock/${id}`).catch(() => [] as BackendStock[])
    const stockByVariant = new Map<string, number>()
    // Rows with no variantId are stock tracked directly against a product
    // that has no variants — see reconcileStock / listAdminProducts.
    let productLevelStock = 0
    for (const s of stockRows) {
      if (s.variantId) {
        stockByVariant.set(s.variantId, (stockByVariant.get(s.variantId) ?? 0) + s.onHand)
      } else {
        productLevelStock += s.onHand
      }
    }

    const variants = rawVariants.map((v) => mapVariant(v, stockByVariant))
    const images = sortMedia(product.media).map((m) => m.url)
    const stock = variants.length > 0
      ? variants.reduce((sum, v) => sum + v.stock, 0)
      : productLevelStock

    return {
      id:          product._id,
      name:        product.name,
      sku:         variants[0]?.sku ?? '',
      stock,
      status:      product.status,
      isPublished:    product.isPublished,
      isSubscribable: product.isSubscribable,
      brand:       product.brand,
      tags:        (product.tagIds ?? []).map((id) => tagNameById.get(id)).filter((n): n is string => Boolean(n)),
      shortDescription: product.shortDescription ?? '',
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
      ingredients:      product.ingredients ?? [],
      benefits:         product.benefits ?? [],
      faqs:             product.faqs ?? [],
      certifications:   product.certifications ?? [],
      supplementInfo:   product.supplementInfo ?? {},
      infoBlocks:       product.infoBlocks ?? [],
      shipping:         product.shippingInfo ?? DEFAULT_SHIPPING,
      seo:              product.seo ?? DEFAULT_SEO,
      variants,
    }
  } catch {
    return null
  }
}

export async function createAdminProduct(input: AdminProductInput): Promise<string> {
  const sellerId = await requireSellerId()
  const tagIds = await resolveTagIds(input.tags)

  const product = await adminApiFetch<{ _id: string }>('/admin/catalog/products', {
    method: 'POST',
    body: { ...productBody(input), tagIds },
  })

  try {
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
    await reconcileStock(product._id, created._id, sellerId, variant.stock)
  }

  // No variants — stock is tracked directly against the product itself.
  if (input.variants.length === 0) {
    await reconcileStock(product._id, undefined, sellerId, input.stock)
  }
  } catch (err) {
    await adminApiFetch(`/admin/catalog/products/${product._id}`, { method: 'DELETE' }).catch(() => undefined)
    throw err
  }

  return product._id
}

export async function updateAdminProduct(id: string, input: AdminProductInput): Promise<void> {
  const sellerId = await requireSellerId()
  const tagIds = await resolveTagIds(input.tags)

  await adminApiFetch(`/admin/catalog/products/${id}`, {
    method: 'PATCH',
    body: { ...productBody(input), tagIds },
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
      await reconcileStock(id, old._id, sellerId, 0)
      await adminApiFetch(`/admin/catalog/variants/${old._id}`, { method: 'DELETE' })
    }
  }

  // No variants — reconcile stock directly against the product itself.
  // Unconditional (unlike the create path) so lowering stock back down,
  // including to 0, is also reflected — matching how an existing variant's
  // stock is always reconciled above.
  if (input.variants.length === 0) {
    await reconcileStock(id, undefined, sellerId, input.stock)
  } else {
    await reconcileStock(id, undefined, sellerId, 0)
  }
}

export async function archiveAdminProduct(id: string): Promise<void> {
  await adminApiFetch(`/admin/catalog/products/${id}`, { method: 'DELETE' })
}
