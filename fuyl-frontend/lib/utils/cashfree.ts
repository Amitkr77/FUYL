'use client'

// Thin wrapper around Cashfree's Web SDK (@cashfreepayments/cashfree-js).
// The SDK is loaded once and memoized; call getCashfree() then .checkout()
// with a payment_session_id obtained from our backend.
import { load, type Cashfree } from '@cashfreepayments/cashfree-js'

let cashfreePromise: Promise<Cashfree> | null = null

export function getCashfree(mode: 'sandbox' | 'production'): Promise<Cashfree> {
  if (!cashfreePromise) {
    cashfreePromise = load({ mode })
  }
  return cashfreePromise
}

/**
 * Drive the recurring-mandate authorization step for a newly-created
 * subscription. Prefers the SDK's subscriptionsCheckout (modal), falling back
 * to a full-page redirect to the hosted auth link when the SDK build lacks it.
 */
export async function authorizeSubscription(
  mode: 'sandbox' | 'production',
  opts: { subscriptionSessionId?: string; authLink?: string },
): Promise<void> {
  if (opts.subscriptionSessionId) {
    const cashfree = await getCashfree(mode)
    if (typeof cashfree.subscriptionsCheckout === 'function') {
      await cashfree.subscriptionsCheckout({
        subsSessionId: opts.subscriptionSessionId,
        redirectTarget: '_modal',
      })
      return
    }
  }
  if (opts.authLink) {
    window.location.href = opts.authLink
    return
  }
  throw new Error('No Cashfree authorization session available for this subscription')
}
