import { apiFetch } from './client'
import type { CartItem } from '@/types/cart'

export interface CouponValidationResult {
  valid:          boolean
  reason?:        string
  discountAmount?: number
  discountType?:  string
  couponCode:     string
}

// No token required — a not-yet-identified guest can validate/apply a
// coupon before their account exists (see fuyl-backend's promotion routes,
// changed to authOptional for exactly this). Per-user limits are simply
// re-checked later, once a real identity exists, by previewCheckout/placeOrder.
export async function validateCoupon(
  code: string,
  items: CartItem[],
  token?: string
): Promise<CouponValidationResult> {
  return apiFetch<CouponValidationResult>('/promotions/validate-coupon', {
    method: 'POST',
    token,
    body: {
      code,
      cartSubtotal: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
      itemCount:    items.reduce((sum, i) => sum + i.quantity, 0),
      items: items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId || undefined,
        quantity:  i.quantity,
        unitPrice: i.price,
      })),
    },
  })
}
