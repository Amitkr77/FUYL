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

export interface Product {
  id: string
  slug: string
  name: string
  title: string
  description: string
  seoDescription: string
  price: number
  compareAtPrice?: number
  images: ProductImage[]
  variants: ProductVariant[]
  tags: string[]
  available: boolean
  rating?: number
  reviewCount?: number
  badge?: string // e.g. "Best Seller", "New"
}

export interface Collection {
  id: string
  slug: string
  title: string
  description: string
  image?: ProductImage
  products: Product[]
}
