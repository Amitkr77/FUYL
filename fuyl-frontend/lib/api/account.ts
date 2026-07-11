import { apiFetch } from './client'
import type { User, Order, OrderLineItem } from '@/types/user'

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

interface BackendOrder {
  _id: string
  orderNumber: string
  createdAt: string
  status: Order['status']
  items: BackendOrderItem[]
  subtotal: number
  shippingTotal: number
  grandTotal: number
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
    shipping: o.shippingTotal,
    total: o.grandTotal,
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
