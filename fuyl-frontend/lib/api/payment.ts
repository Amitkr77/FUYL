import { apiFetch } from './client'

export type PaymentMethod = 'cashfree' | 'cod' | 'wallet'

interface BackendCreatePaymentResult {
  payment: { _id: string }
  cod?: true
  wallet?: true
  cashfree?: {
    orderId: string
    paymentSessionId: string
    amount: number
    currency: string
    mode: 'sandbox' | 'production'
  }
}

export type CreatePaymentResult =
  | { method: 'cod' }
  | { method: 'wallet' }
  | {
      method: 'cashfree'
      cfOrderId: string
      paymentSessionId: string
      amount: number
      currency: string
      mode: 'sandbox' | 'production'
    }

// Step 2 of checkout (after placeOrder): actually attempts payment.
// COD -> records a pending payment, done. Wallet -> order fully covered by
// wallet debit (done at placeOrder time), no gateway needed. Cashfree ->
// creates a gateway order and returns the payment_session_id the client SDK
// needs to render checkout.
export async function createPayment(token: string, orderId: string, method: PaymentMethod): Promise<CreatePaymentResult> {
  const raw = await apiFetch<BackendCreatePaymentResult>('/payments', {
    method: 'POST',
    body:   { orderId, method },
    token,
  })
  if (raw.cashfree) {
    return {
      method:           'cashfree',
      cfOrderId:        raw.cashfree.orderId,
      paymentSessionId: raw.cashfree.paymentSessionId,
      amount:           raw.cashfree.amount,
      currency:         raw.cashfree.currency,
      mode:             raw.cashfree.mode,
    }
  }
  if (raw.wallet) return { method: 'wallet' }
  return { method: 'cod' }
}

// ─── Payment records for an order (shown on the order detail page) ──────────
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

export interface OrderPayment {
  id: string
  amount: number
  currency: string
  status: string
  gateway: string
  reference?: string
  capturedAt?: string
  refundedAmount: number
}

export async function getOrderPayments(token: string, orderId: string): Promise<OrderPayment[]> {
  const raw = await apiFetch<BackendOrderPayment[]>(`/orders/${orderId}/payments`, { token })
  return (raw ?? []).map((p) => ({
    id:             p._id,
    amount:         p.amount,
    currency:       p.currency,
    status:         p.status,
    gateway:        p.gateway,
    reference:      p.cfPaymentId ?? p.razorpayPaymentId,
    capturedAt:     p.capturedAt,
    refundedAmount: p.refundedAmount ?? 0,
  }))
}

// Step 3 (Cashfree only): after the shopper completes the SDK checkout, confirm
// server-side. Cashfree has no client-side signature — the server fetches the
// order status. Throws if the payment isn't completed (the webhook is the
// backstop that reconciles it regardless).
export async function verifyPayment(token: string, opts: { cfOrderId: string }): Promise<void> {
  await apiFetch('/payments/verify', { method: 'POST', body: opts, token })
}
