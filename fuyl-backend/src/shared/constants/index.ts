/**
 * Currency unit convention: every monetary field in this codebase (models, service
 * inputs/outputs, API request/response bodies) is a decimal amount in whole rupees
 * (e.g. 1499, 1499.50) — never paise. The sole exception is the literal `amount`
 * parameter sent to/received from the Razorpay REST API, which uses paise per
 * Razorpay's contract; that conversion happens only inside
 * `payment/utils/razorpay.ts` and its two call sites (payment & subscription
 * services), and nowhere else.
 */
export const Constants = {
  DEFAULT_CURRENCY: 'INR',
  DEFAULT_TIMEZONE: 'Asia/Kolkata',
  WALLET_MIN_BALANCE: 0,
  WALLET_MAX_BALANCE: 100000,
  CART_TTL_DAYS: 30,
  SESSION_TTL_HOURS: 24,
  REFERRAL_CODE_LENGTH: 6,
  ORDER_ID_PREFIX: 'FUL',
  INVOICE_PREFIX: 'INV',
  SUBSCRIPTION_PREFIX: 'SUB',
} as const;
