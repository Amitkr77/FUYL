import { apiFetch } from './client'

// Matches fuyl-backend/src/modules/checkout/validators/index.ts's
// checkoutAddressSchema exactly (which itself mirrors Order's required
// address fields — see the backend fix made alongside this file).
export interface CheckoutAddressInput {
  fullName: string
  phone:    string
  line1:    string
  line2?:   string
  city:     string
  state:    string
  pincode:  string
  country?: string
  type?:    'home' | 'office' | 'other'
}

export type CheckoutPaymentMethod = 'razorpay' | 'cod'

export interface CheckoutInput {
  shippingAddress: CheckoutAddressInput
  paymentMethod:   CheckoutPaymentMethod
  couponCode?:     string
}

interface BackendPreview {
  grandTotal: number
  pricing: { subtotal: number; discountTotal: number; taxTotal: number; shippingTotal: number }
}

export interface CheckoutPreview {
  subtotal:      number
  discountTotal: number
  taxTotal:      number
  shippingTotal: number
  grandTotal:    number
}

function mapPreview(raw: BackendPreview): CheckoutPreview {
  return {
    subtotal:      raw.pricing.subtotal,
    discountTotal: raw.pricing.discountTotal,
    taxTotal:      raw.pricing.taxTotal,
    shippingTotal: raw.pricing.shippingTotal,
    grandTotal:    raw.grandTotal,
  }
}

// Pre-flight — validates address/coupon/payment method and computes the real
// (tax-inclusive) total without creating anything. Nothing is charged or
// reserved by this call.
export async function previewCheckout(token: string, input: CheckoutInput): Promise<CheckoutPreview> {
  const raw = await apiFetch<BackendPreview>('/checkout/preview', { method: 'POST', body: input, token })
  return mapPreview(raw)
}

interface BackendPlaceOrderResult {
  order: { _id: string; orderNumber: string }
  grandTotal: number
}

export interface PlaceOrderResult {
  orderId:     string
  orderNumber: string
  grandTotal:  number
}

// Creates the order (stock reservation, order record). Does NOT charge the
// customer — that's a separate call to createPayment() in lib/api/payment.ts.
export async function placeOrder(token: string, input: CheckoutInput): Promise<PlaceOrderResult> {
  const raw = await apiFetch<BackendPlaceOrderResult>('/checkout/place-order', { method: 'POST', body: input, token })
  return { orderId: raw.order._id, orderNumber: raw.order.orderNumber, grandTotal: raw.grandTotal }
}
