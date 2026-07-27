// The @cashfreepayments/cashfree-js package ships no TypeScript types, so we
// declare the small surface we use. Mirrors the v1 Web SDK `load()` + checkout.
declare module '@cashfreepayments/cashfree-js' {
  export interface CashfreeCheckoutOptions {
    paymentSessionId: string
    /** '_modal' keeps the shopper on-page; '_self' navigates away. */
    redirectTarget?: '_self' | '_blank' | '_top' | '_modal'
  }

  export interface CashfreeCheckoutResult {
    error?: { message?: string; code?: string; type?: string }
    redirect?: boolean
    paymentDetails?: { paymentMessage?: string; [key: string]: unknown }
  }

  export interface CashfreeSubscriptionCheckoutOptions {
    subsSessionId: string
    redirectTarget?: '_self' | '_blank' | '_top' | '_modal'
  }

  export interface Cashfree {
    checkout(options: CashfreeCheckoutOptions): Promise<CashfreeCheckoutResult>
    // Present in SDK builds that support recurring mandate authorization.
    subscriptionsCheckout?(options: CashfreeSubscriptionCheckoutOptions): Promise<CashfreeCheckoutResult>
  }

  export function load(options: { mode: 'sandbox' | 'production' }): Promise<Cashfree>
}
