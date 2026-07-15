import { apiFetch } from './client'
import type { User, Order, OrderLineItem, OrderAddress, OrderTimelineEvent } from '@/types/user'

// ─── Backend response shapes ──────────────────────────────────────────────
// The backend returns its raw Mongoose documents (_id, grandTotal,
// shippingTotal, unitPrice, ...), not the frontend's idealized User/Order
// shape. These mappers translate between them so the rest of the app can
// keep using the existing types unchanged.
interface BackendUser {
  _id: string
  email: string
  firstName?: string
  lastName?: string
  phone?: string
}

interface BackendOrderItem {
  productId: string
  variantId?: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  image?: string
}

interface BackendTimelineEvent {
  status: Order['status']
  at: string
  note?: string
}

interface BackendOrder {
  _id: string
  orderNumber: string
  createdAt: string
  status: Order['status']
  items: BackendOrderItem[]
  subtotal: number
  discountTotal: number
  taxTotal: number
  shippingTotal: number
  grandTotal: number
  paymentMethod: Order['paymentMethod']
  paymentStatus: Order['paymentStatus']
  razorpayPaymentId?: string
  shippingAddress: OrderAddress
  billingAddress: OrderAddress
  trackingNumber?: string
  trackingUrl?: string
  carrier?: string
  timeline: BackendTimelineEvent[]
  placedAt: string
  shippedAt?: string
  deliveredAt?: string
  cancelledAt?: string
  cancelledReason?: string
  notes?: string
}

function mapUser(u: BackendUser): User {
  return {
    id: u._id,
    email: u.email,
    firstName: u.firstName ?? '',
    lastName: u.lastName ?? '',
    phone: u.phone,
  }
}

function mapOrder(o: BackendOrder): Order {
  return {
    id: o._id,
    orderNumber: o.orderNumber,
    createdAt: o.createdAt,
    status: o.status,
    items: o.items.map((i): OrderLineItem => ({
      id: i.variantId ? `${i.productId}-${i.variantId}` : i.productId,
      name: i.name,
      quantity: i.quantity,
      price: i.unitPrice,
      image: i.image ?? '',
    })),
    subtotal: o.subtotal,
    discountTotal: o.discountTotal,
    taxTotal: o.taxTotal,
    shipping: o.shippingTotal,
    total: o.grandTotal,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    razorpayPaymentId: o.razorpayPaymentId,
    shippingAddress: o.shippingAddress,
    billingAddress: o.billingAddress,
    trackingNumber: o.trackingNumber,
    trackingUrl: o.trackingUrl,
    carrier: o.carrier,
    timeline: (o.timeline ?? []).map((t): OrderTimelineEvent => ({
      status: t.status,
      at: t.at,
      note: t.note,
    })),
    placedAt: o.placedAt ?? o.createdAt,
    shippedAt: o.shippedAt,
    deliveredAt: o.deliveredAt,
    cancelledAt: o.cancelledAt,
    cancelledReason: o.cancelledReason,
    notes: o.notes,
  }
}

export async function login(payload: { email: string; password: string }): Promise<{ accessToken: string; user: User }> {
  const res = await apiFetch<{ accessToken: string; user: BackendUser }>('/auth/login', { method: 'POST', body: payload })
  return { accessToken: res.accessToken, user: mapUser(res.user) }
}

export async function register(payload: {
  firstName: string
  lastName:  string
  email:     string
  password:  string
  phone?:    string
  referralCode?: string
}): Promise<{ accessToken: string; user: User }> {
  const res = await apiFetch<{ accessToken: string; user: BackendUser }>('/auth/register', { method: 'POST', body: payload })
  return { accessToken: res.accessToken, user: mapUser(res.user) }
}

// ─── Checkout identify — lets checkout resolve/create an account inline,
// without ever sending the shopper to a separate login/register page. ────

export async function checkEmailExists(email: string): Promise<boolean> {
  const res = await apiFetch<{ exists: boolean }>(`/auth/email-exists?email=${encodeURIComponent(email)}`)
  return res.exists
}

export type CheckoutIdentifyResult =
  | { status: 'needs_password' }
  | { status: 'authenticated'; accessToken: string; user: User; isNewAccount: boolean }

export async function checkoutIdentify(payload: {
  email: string
  password?: string
  fullName?: string
  phone?: string
  guestId?: string
}): Promise<CheckoutIdentifyResult> {
  const { guestId, ...body } = payload
  const res = await apiFetch<
    | { status: 'needs_password' }
    | { status: 'authenticated'; accessToken: string; user: BackendUser; isNewAccount: boolean }
  >('/auth/checkout-identify', { method: 'POST', body, guestId })
  if (res.status === 'needs_password') return res
  return { status: 'authenticated', accessToken: res.accessToken, user: mapUser(res.user), isNewAccount: res.isNewAccount }
}

export async function getProfile(token: string): Promise<User> {
  const res = await apiFetch<BackendUser>('/auth/me', { token })
  return mapUser(res)
}

export async function updateProfile(
  token:   string,
  payload: Partial<Pick<User, 'firstName' | 'lastName' | 'phone'>>
): Promise<User> {
  const res = await apiFetch<BackendUser>('/auth/me', { method: 'PATCH', body: payload, token })
  return mapUser(res)
}

export async function getOrders(token: string): Promise<Order[]> {
  const res = await apiFetch<BackendOrder[]>('/orders/me', { token })
  return res.map(mapOrder)
}

export async function getOrder(token: string, orderId: string): Promise<Order> {
  const res = await apiFetch<BackendOrder>(`/orders/${orderId}`, { token })
  return mapOrder(res)
}

export async function forgotPassword(email: string): Promise<void> {
  return apiFetch('/auth/forgot-password', { method: 'POST', body: { email } })
}

export async function resetPassword(token: string, password: string): Promise<void> {
  return apiFetch('/auth/reset-password', { method: 'POST', body: { token, password } })
}
