import { z } from 'zod';

export const couponSchema = z.object({
  code: z.string().min(3).max(30).regex(/^[A-Z0-9_-]+$/i, 'Code must be alphanumeric/dash/underscore'),
  discountType: z.enum(['percent', 'flat', 'per_unit', 'free_shipping']),
  discountValue: z.number().min(0),
  scope: z.enum(['cart', 'category', 'product', 'variant', 'seller']).default('cart'),
  targetIds: z.array(z.string().length(24)).optional(),
  currency: z.string().default('INR'),
  maxRedemptionsGlobal: z.number().int().min(0).optional(),
  maxRedemptionsPerUser: z.number().int().min(0).default(1),
  minOrderSubtotal: z.number().min(0).optional(),
  maxDiscountAmount: z.number().min(0).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  isFirstOrderOnly: z.boolean().default(false),
  isReferralReward: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const createCampaignSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional(),
  status: z.enum(['draft', 'active', 'paused', 'ended']).default('draft'),
  type: z.enum(['coupon', 'automatic', 'bundle', 'flash_sale']).default('coupon'),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  coupons: z.array(couponSchema).default([]),
  autoRule: z.object({
    discountType: z.enum(['percent', 'flat', 'per_unit', 'free_shipping']),
    discountValue: z.number().min(0),
    scope: z.enum(['cart', 'category', 'product', 'variant', 'seller']).default('cart'),
    targetIds: z.array(z.string().length(24)).optional(),
    minOrderSubtotal: z.number().min(0).optional(),
  }).optional(),
  customerRoles: z.array(z.string()).optional(),
  customerIds: z.array(z.string().length(24)).optional(),
  bannerUrl: z.string().url().optional(),
  badgeText: z.string().max(30).optional(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateCampaignSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['draft', 'active', 'paused', 'ended']).optional(),
  endsAt: z.string().datetime().optional(),
  coupons: z.array(couponSchema).optional(),
  customerRoles: z.array(z.string()).optional(),
  customerIds: z.array(z.string().length(24)).optional(),
  bannerUrl: z.string().url().optional(),
  badgeText: z.string().max(30).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const validateCouponSchema = z.object({
  code: z.string().min(3).max(30),
  cartSubtotal: z.number().min(0),
  itemCount: z.number().int().min(0).optional(),
  isFirstOrder: z.boolean().optional(),
  items: z.array(z.object({
    productId: z.string().length(24),
    variantId: z.string().length(24).optional(),
    quantity: z.number().int().min(1),
    unitPrice: z.number().min(0),
    sellerId: z.string().optional(),
    categoryIds: z.array(z.string()).optional(),
  })).default([]),
});

export type CreateCampaignDTO = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignDTO = z.infer<typeof updateCampaignSchema>;
export type CouponDTO = z.infer<typeof couponSchema>;
export type ValidateCouponDTO = z.infer<typeof validateCouponSchema>;
