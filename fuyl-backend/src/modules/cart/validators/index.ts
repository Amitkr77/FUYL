import { z } from 'zod';

export const addToCartSchema = z.object({
  productId: z.string().length(24),
  variantId: z.string().length(24).optional(),
  quantity: z.number().int().min(1).max(99).default(1),
  subscriptionInterval: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly']).optional(),
  subscriptionDiscountPercent: z.number().min(0).max(100).optional(),
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
