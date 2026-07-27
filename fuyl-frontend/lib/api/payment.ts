import { apiFetch } from './client'

export type PaymentMethod = 'cashfree' | 'cod'

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
  | {
      method: 'cashfree'
      cfOrderId: string
      paymentSessionId: string
      amount: number
      currency: string
      mode: 'sandbox' | 'production'
    }

// Step 2 of checkout (after placeOrder): actually attempts payment.
// COD -> records a pending payment, done. Cashfree -> creates a gateway order
// and returns the payment_session_id the client SDK needs to render checkout.
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
  return { method: 'cod' }
}

// Step 3 (Cashfree only): after the shopper completes the SDK checkout, confirm
// server-side. Cashfree has no client-side signature — the server fetches the
// order status. Throws if the payment isn't completed (the webhook is the
// backstop that reconciles it regardless).
export async function verifyPayment(token: string, opts: { cfOrderId: string }): Promise<void> {
  await apiFetch('/payments/verify', { method: 'POST', body: opts, token })
}
