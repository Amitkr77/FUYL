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
  sku: string
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
  seoDescription: string
  price: number
  compareAtPrice?: number
  additionalPrices: AdditionalPrice[]
  unitPrice?: UnitPrice
  images: ProductImage[]
  variants: ProductVariant[]
  tags: string[]
  available: boolean
  isSubscribable: boolean
  rating?: number
  reviewCount?: number
  badge?: string // e.g. "Best Seller", "New"
  ingredients: string[]
  benefits: string[]
  faqs: ProductFAQ[]
  certifications: Certification[]
  supplementInfo: SupplementInfo
}

export interface Collection {
  id: string
  slug: string
  title: string
  description: string
  image?: ProductImage
  products: Product[]
}
