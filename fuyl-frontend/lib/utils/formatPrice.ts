/**
 * Format a price to an INR display string. `amount` is always a decimal rupee
 * value (e.g. 1499, 1499.5) — the backend never returns paise. Paise only ever
 * exists transiently inside the backend's Razorpay gateway calls and should
 * never reach this function.
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style:    'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/** Returns a discount percentage string, e.g. "7% off" */
export function discountPercent(price: number, compareAtPrice: number): string {
  if (!compareAtPrice || compareAtPrice <= price) return ''
  const pct = Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
  return `${pct}% off`
}
