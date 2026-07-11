import { apiFetch } from './client'

export type PaymentMethod = 'razorpay' | 'cod'

interface BackendCreatePaymentResult {
  payment: { _id: string }
  cod?: true
  razorpay?: { orderId: string; amount: number; currency: string; keyId: string }
}

export type CreatePaymentResult =
  | { method: 'cod' }
  // amount/currency here are in paise — the one place on the frontend that
  // legitimately deals in the Razorpay gateway's unit, matching the backend's
  // own documented convention (see shared/constants/index.ts on the backend).
  | { method: 'razorpay'; orderId: string; amount: number; currency: string; keyId: string }

// Step 2 of checkout (after placeOrder): actually attempts payment.
// COD -> records a pending payment, done. Razorpay -> creates a gateway
// order and returns what the client needs to open Razorpay Checkout.js.
export async function createPayment(token: string, orderId: string, method: PaymentMethod): Promise<CreatePaymentResult> {
  const raw = await apiFetch<BackendCreatePaymentResult>('/payments', {
    method: 'POST',
    body:   { orderId, method },
    token,
  })
  if (raw.razorpay) return { method: 'razorpay', ...raw.razorpay }
  return { method: 'cod' }
}

// Step 3 (Razorpay only): verify the signature Razorpay's client SDK returns
// after the customer completes payment in the checkout modal.
export async function verifyPayment(
  token: string,
  opts: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }
): Promise<void> {
  await apiFetch('/payments/verify', { method: 'POST', body: opts, token })
}
