'use client'

// Thin wrapper around Razorpay's Checkout.js, loaded via <Script src="https://
// checkout.razorpay.com/v1/checkout.js">. Not an npm package — Razorpay only
// ships this as a hosted script that attaches `window.Razorpay`.

interface RazorpayInstance {
  open: () => void
}

interface RazorpayHandlerResponse {
  razorpay_payment_id: string
  razorpay_order_id:   string
  razorpay_signature:  string
}

interface RazorpayConstructorOptions {
  key:         string
  amount:      number
  currency:    string
  order_id:    string
  name:        string
  description?: string
  prefill?:    { name?: string; email?: string; contact?: string }
  handler:     (response: RazorpayHandlerResponse) => void
  modal?:      { ondismiss?: () => void }
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayConstructorOptions) => RazorpayInstance
  }
}

export function openRazorpayCheckout(opts: {
  key:      string
  amount:   number
  currency: string
  orderId:  string
  name:     string
  description?: string
  prefill?: { name?: string; email?: string; contact?: string }
  onSuccess: (response: RazorpayHandlerResponse) => void
  onDismiss?: () => void
}): void {
  if (!window.Razorpay) {
    throw new Error('Razorpay checkout script has not loaded yet')
  }
  const rzp = new window.Razorpay({
    key:         opts.key,
    amount:      opts.amount,
    currency:    opts.currency,
    order_id:    opts.orderId,
    name:        opts.name,
    description: opts.description,
    prefill:     opts.prefill,
    handler:     opts.onSuccess,
    modal:       { ondismiss: opts.onDismiss },
  })
  rzp.open()
}
