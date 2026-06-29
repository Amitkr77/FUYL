/**
 * Format a price in paise (or rupees if already float) to INR display string.
 * Backend returns prices in rupees as numbers (e.g. 1499).
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
