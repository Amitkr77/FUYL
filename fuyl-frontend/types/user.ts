export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
}

export interface Address {
  id: string
  firstName: string
  lastName: string
  address1: string
  address2?: string
  city: string
  state: string
  pincode: string
  country: string
  phone: string
}

export interface OrderLineItem {
  id: string
  name: string
  quantity: number
  price: number
  image: string
}

// Mirrors the backend's canonical OrderStatus enum (src/shared/enums/index.ts)
// exactly — do not diverge without updating both sides.
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'packed'
  | 'shipped'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'returned'

export interface Order {
  id: string
  orderNumber: string
  createdAt: string
  status: OrderStatus
  items: OrderLineItem[]
  subtotal: number
  shipping: number
  total: number
  trackingUrl?: string
}
