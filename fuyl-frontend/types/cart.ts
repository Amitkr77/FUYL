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
  subscriptionInterval?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly'
  subscriptionDiscountPercent?: number
}

export interface Cart {
  id: string | null
  items: CartItem[]
  subtotal: number
  itemCount: number
}
