import { adminApiFetch, AdminApiError } from './api'
import type { OrderStatus } from './orderStatus'

// ─── Backend raw shapes (subset of fields this file uses) ──────────────────
// Mirrors fuyl-backend's order.model.ts. Note: Order has no populate() and
// no customer name/email field anywhere — only what's embedded directly on
// the order via shippingAddress (fullName, phone), captured at checkout.
// There is no admin customer-lookup endpoint yet (a known backend gap, see
// the integration audit), so "customer" here means "who this order shipped
// to," not a live-linked user record.

// OrderStatus and MANUAL_STATUS_OPTIONS now live in lib/orderStatus.ts (a
// zero-dependency file) — re-exported here so existing server-side imports
// from '@/lib/orders' keep working unchanged. Client Components needing
// MANUAL_STATUS_OPTIONS must import it from '@/lib/orderStatus' directly,
// not from here — see that file's comment for why.
export type { OrderStatus } from './orderStatus'
export { MANUAL_STATUS_OPTIONS } from './orderStatus'

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
  discountTotal: number
  taxTotal: number
  shippingTotal: number
  grandTotal: number
  shippingAddress: BackendAddress
  timeline: BackendTimelineEvent[]
  placedAt: string
  trackingNumber?: string
  trackingUrl?: string
  carrier?: string
  paymentMethod?: string
  paymentStatus?: string
  metadata?: {
    walletRedemption?: number
    loyaltyRedemption?: number
    loyaltyPointsRedeemed?: number
  }
}

interface BackendOrderPayment {
  _id: string
  amount: number
  currency: string
  status: string
  gateway: string
  cfPaymentId?: string
  razorpayPaymentId?: string
  capturedAt?: string
  refundedAmount?: number
}

export interface AdminOrderPayment {
  amount: number
  currency: string
  status: string
  gateway: string
  reference?: string
  capturedAt?: string
  refundedAmount: number
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
  discountTotal: number
  taxTotal: number
  shippingTotal: number
  walletApplied: number
  loyaltyApplied: number
  loyaltyPointsRedeemed: number
  address: BackendAddress
  timeline: { status: OrderStatus; at: string; note?: string }[]
  trackingNumber?: string
  trackingUrl?: string
  carrier?: string
  paymentMethod: string
  paymentStatus: string
  payments: AdminOrderPayment[]
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
    // Payment records (amount/gateway/reference/date) — non-fatal if missing.
    let payments: AdminOrderPayment[] = []
    try {
      const raw = await adminApiFetch<BackendOrderPayment[]>(`/orders/${id}/payments`)
      payments = (raw ?? []).map((p) => ({
        amount:         p.amount,
        currency:       p.currency,
        status:         p.status,
        gateway:        p.gateway,
        reference:      p.cfPaymentId ?? p.razorpayPaymentId,
        capturedAt:     p.capturedAt,
        refundedAmount: p.refundedAmount ?? 0,
      }))
    } catch { /* leave empty — order-level method/status still render */ }

    return {
      ...mapOrder(o),
      items: o.items.map((i) => ({
        name: i.name, quantity: i.quantity, unitPrice: i.unitPrice, totalPrice: i.totalPrice, image: i.image,
      })),
      subtotal:              o.subtotal,
      discountTotal:         o.discountTotal ?? 0,
      taxTotal:              o.taxTotal,
      shippingTotal:         o.shippingTotal,
      walletApplied:         Number(o.metadata?.walletRedemption ?? 0),
      loyaltyApplied:        Number(o.metadata?.loyaltyRedemption ?? 0),
      loyaltyPointsRedeemed: Number(o.metadata?.loyaltyPointsRedeemed ?? 0),
      address:               o.shippingAddress,
      timeline:              o.timeline ?? [],
      trackingNumber:        o.trackingNumber,
      trackingUrl:           o.trackingUrl,
      carrier:               o.carrier,
      paymentMethod:         o.paymentMethod ?? 'unknown',
      paymentStatus:         o.paymentStatus ?? 'pending',
      payments,
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
