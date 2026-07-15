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

// Mirrors the backend's PaymentMethod / PaymentStatus enums (src/shared/enums/index.ts).
export type OrderPaymentMethod = 'razorpay' | 'upi' | 'cod' | 'wallet' | 'split'
export type OrderPaymentStatus = 'pending' | 'success' | 'failed' | 'refunded' | 'partially_refunded'

export interface OrderAddress {
  fullName: string
  phone: string
  line1: string
  line2?: string
  city: string
  state: string
  pincode: string
  country: string
  type: 'home' | 'office' | 'other'
}

export interface OrderTimelineEvent {
  status: OrderStatus
  at: string
  note?: string
}

export interface Order {
  id: string
  orderNumber: string
  createdAt: string
  status: OrderStatus
  items: OrderLineItem[]
  subtotal: number
  discountTotal: number
  taxTotal: number
  shipping: number
  total: number
  paymentMethod: OrderPaymentMethod
  paymentStatus: OrderPaymentStatus
  razorpayPaymentId?: string
  shippingAddress: OrderAddress
  billingAddress: OrderAddress
  trackingNumber?: string
  trackingUrl?: string
  carrier?: string
  timeline: OrderTimelineEvent[]
  placedAt: string
  shippedAt?: string
  deliveredAt?: string
  cancelledAt?: string
  cancelledReason?: string
  notes?: string
}
