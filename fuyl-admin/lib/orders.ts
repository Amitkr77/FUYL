import { adminApiFetch, AdminApiError } from './api'

// ─── Backend raw shapes (subset of fields this file uses) ──────────────────
// Mirrors fuyl-backend's order.model.ts. Note: Order has no populate() and
// no customer name/email field anywhere — only what's embedded directly on
// the order via shippingAddress (fullName, phone), captured at checkout.
// There is no admin customer-lookup endpoint yet (a known backend gap, see
// the integration audit), so "customer" here means "who this order shipped
// to," not a live-linked user record.

export type OrderStatus =
  | 'pending' | 'confirmed' | 'packed' | 'shipped' | 'delivered'
  | 'completed' | 'cancelled' | 'returned'

// Statuses PATCH /admin/orders/:id/status actually accepts (verified against
// updateStatusSchema) — 'returned' is never settable this way, and
// 'cancelled' is rejected there too (must go through the cancel endpoint,
// handled separately in updateAdminOrderStatus below).
export const MANUAL_STATUS_OPTIONS: OrderStatus[] = [
  'pending', 'confirmed', 'packed', 'shipped', 'delivered', 'completed', 'cancelled',
]

interface BackendAddress {
  fullName: string
  phone:    string
  line1:    string
  line2?:   string
  city:     string
  state:    string
  pincode:  string
  country:  string
}

interface BackendOrderItem {
  productId: string
  name:      string
  quantity:  number
  unitPrice: number
  totalPrice: number
  image?:    string
}

interface BackendTimelineEvent {
  status: OrderStatus
  at:     string
  note?:  string
}

interface BackendOrder {
  _id: string
  orderNumber: string
  customerId: string
  status: OrderStatus
  items: BackendOrderItem[]
  subtotal: number
  taxTotal: number
  shippingTotal: number
  grandTotal: number
  shippingAddress: BackendAddress
  timeline: BackendTimelineEvent[]
  placedAt: string
  trackingNumber?: string
  trackingUrl?: string
  carrier?: string
}

export interface AdminOrder {
  id:           string   // Mongo _id — used for routing/API calls
  orderNumber:  string   // human-readable label, e.g. FUL-2026-00001
  customerId:   string   // links to /customers/:id (now that that endpoint exists)
  customerName: string
  phone:        string
  date:         string
  itemCount:    number
  total:        number
  status:       OrderStatus
}

export interface AdminOrderDetail extends AdminOrder {
  items: { name: string; quantity: number; unitPrice: number; totalPrice: number; image?: string }[]
  subtotal: number
  taxTotal: number
  shippingTotal: number
  address: BackendAddress
  timeline: { status: OrderStatus; at: string; note?: string }[]
  trackingNumber?: string
  trackingUrl?: string
  carrier?: string
}

function mapOrder(o: BackendOrder): AdminOrder {
  return {
    id:           o._id,
    orderNumber:  o.orderNumber,
    customerId:   o.customerId,
    customerName: o.shippingAddress?.fullName ?? 'Unknown',
    phone:        o.shippingAddress?.phone ?? '',
    date:         o.placedAt,
    itemCount:    o.items.length,
    total:        o.grandTotal,
    status:       o.status,
  }
}

export async function listAdminOrders(): Promise<AdminOrder[]> {
  const orders = await adminApiFetch<BackendOrder[]>('/admin/orders?limit=50')
  return orders.map(mapOrder)
}

export async function getAdminOrder(id: string): Promise<AdminOrderDetail | null> {
  try {
    // No dedicated admin single-order route — the plain GET /orders/:id only
    // enforces its ownership check for the 'customer' role, so it works for
    // admin/seller/super_admin too (verified in order.controller.ts).
    const o = await adminApiFetch<BackendOrder>(`/orders/${id}`)
    return {
      ...mapOrder(o),
      items: o.items.map((i) => ({
        name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, totalPrice: i.totalPrice, image: i.image,
      })),
      subtotal:      o.subtotal,
      taxTotal:      o.taxTotal,
      shippingTotal: o.shippingTotal,
      address:       o.shippingAddress,
      timeline:      o.timeline ?? [],
      trackingNumber: o.trackingNumber,
      trackingUrl:    o.trackingUrl,
      carrier:        o.carrier,
    }
  } catch {
    return null
  }
}

export interface StatusUpdateInput {
  status: OrderStatus
  note?:  string
  trackingNumber?: string
  trackingUrl?:    string
  carrier?:        string
}

export async function updateAdminOrderStatus(id: string, input: StatusUpdateInput): Promise<void> {
  if (input.status === 'cancelled') {
    // PATCH .../status explicitly rejects 'cancelled' — the backend requires
    // going through the dedicated cancel endpoint instead (it needs a reason
    // and applies its own refund/terminal-state rules).
    await adminApiFetch(`/orders/${id}/cancel`, {
      method: 'POST',
      body:   { reason: input.note?.trim() || 'Cancelled by admin' },
    })
    return
  }

  await adminApiFetch(`/admin/orders/${id}/status`, {
    method: 'PATCH',
    body: {
      status: input.status,
      note:   input.note || undefined,
      trackingNumber: input.trackingNumber || undefined,
      trackingUrl:    input.trackingUrl || undefined,
      carrier:        input.carrier || undefined,
    },
  })
}

export { AdminApiError }
