export interface CartItem {
  id: string          // line item id
  productId: string
  variantId: string
  slug: string
  name: string
  variantTitle: string
  price: number
  quantity: number
  image: string
  imageAlt: string
}

export interface Cart {
  id: string | null
  items: CartItem[]
  subtotal: number
  itemCount: number
}
