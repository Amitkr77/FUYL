export interface ProductImage {
  id: string
  url: string
  altText: string
  width: number
  height: number
}

export interface ProductVariant {
  id: string
  title: string
  price: number
  compareAtPrice?: number
  available: boolean
  availableQty?: number  // live inventory count; undefined = not yet fetched
  sku: string
  weight?: number
  weightUnit?: string
}

export interface AdditionalPrice {
  label: string
  price: number
}

export interface UnitPrice {
  value: number
  unit: string
}

export interface ProductFAQ {
  question: string
  answer: string
}

export interface Certification {
  label: string
  logoUrl: string
}

// Repeatable rich-content block (image + optional title + description) an
// admin can attach to a product — see catalog/models/product.model.ts
// IProductInfoBlock.
export interface ProductInfoBlock {
  image?: string
  title?: string
  description: string
}

export interface SupplementInfo {
  ageGroup?: string
  dietaryUse?: string
  flavor?: string
  ingredientCategory?: string
  routeOfAdministration?: string
  healthFocus?: string[]
}

export interface Product {
  id: string
  slug: string
  name: string
  title: string
  description: string
  shortDescription?: string
  seoDescription: string
  price: number
  compareAtPrice?: number
  additionalPrices: AdditionalPrice[]
  unitPrice?: UnitPrice
  weight?: number
  weightUnit?: string
  images: ProductImage[]
  variants: ProductVariant[]
  tags: string[]
  available: boolean
  isTaxable: boolean
  isSubscribable: boolean
  rating?: number
  reviewCount?: number
  badge?: string // e.g. "Best Seller", "New"
  ingredients: string[]
  benefits: string[]
  faqs: ProductFAQ[]
  certifications: Certification[]
  supplementInfo: SupplementInfo
  infoBlocks: ProductInfoBlock[]
}

export interface Collection {
  id: string
  slug: string
  title: string
  description: string
  image?: ProductImage
  products: Product[]
}
