import { z } from 'zod';

export const addToCartSchema = z.object({
  productId: z.string().length(24),
  variantId: z.string().length(24).optional(),
  quantity: z.number().int().min(1).max(99).default(1),
  subscriptionInterval: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly']).optional(),
  // NOTE: the subscription discount is intentionally NOT accepted from the
  // client — it is derived server-side from the active subscription plan for
  // the chosen interval (see cart.service.addItem). Trusting a client-supplied
  // percent let a shopper set their own price (e.g. 100% off → ₹0 order).
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(99),
});

export const applyCouponSchema = z.object({
  couponCode: z.string().min(2).max(40),
});

export const applyReferralSchema = z.object({
  referralCode: z.string().min(4).max(50),
});

export type AddToCartDTO = z.infer<typeof addToCartSchema>;
export type UpdateCartItemDTO = z.infer<typeof updateCartItemSchema>;
export type ApplyCouponDTO = z.infer<typeof applyCouponSchema>;
export type ApplyReferralDTO = z.infer<typeof applyReferralSchema>;
