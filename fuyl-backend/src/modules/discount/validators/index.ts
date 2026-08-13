import { z } from 'zod';

export const couponSchema = z.object({
  code: z.string().min(3).max(30).regex(/^[A-Z0-9_-]+$/i, 'Code must be alphanumeric/dash/underscore'),
  discountType: z.enum(['percent', 'flat', 'per_unit', 'free_shipping', 'buy_x_get_y']),
  discountValue: z.number().min(0),
  scope: z.enum(['cart', 'category', 'product', 'variant']).default('cart'),
  targetIds: z.array(z.string().length(24)).optional(),
  currency: z.string().default('INR'),
  maxRedemptionsGlobal: z.number().int().min(0).optional(),
  maxRedemptionsPerUser: z.number().int().min(0).default(1),
  minOrderSubtotal: z.number().min(0).optional(),
  maxDiscountAmount: z.number().min(0).optional(),
  buyQuantity: z.number().int().min(1).optional(),
  getQuantity: z.number().int().min(1).optional(),
  buyTargetIds: z.array(z.string().length(24)).optional(),
  getTargetIds: z.array(z.string().length(24)).optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().optional(),
  isFirstOrderOnly: z.boolean().default(false),
  isReferralReward: z.boolean().default(false),
  isActive: z.boolean().default(true),
}).superRefine((coupon, ctx) => {
  if (coupon.discountType !== 'free_shipping' && coupon.discountValue <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discountValue'], message: 'Discount value must be greater than zero' });
  }
  if (coupon.discountType === 'percent' && coupon.discountValue > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discountValue'], message: 'Percentage cannot exceed 100' });
  }
  if (coupon.discountType === 'buy_x_get_y') {
    if (!coupon.buyQuantity) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['buyQuantity'], message: 'Buy quantity is required' });
    if (!coupon.getQuantity) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['getQuantity'], message: 'Get quantity is required' });
    if (!coupon.buyTargetIds?.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['buyTargetIds'], message: 'Select at least one qualifying product' });
    if (!coupon.getTargetIds?.length) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['getTargetIds'], message: 'Select at least one reward product' });
    if (coupon.discountValue > 100) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['discountValue'], message: 'Reward percentage cannot exceed 100' });
  }
  if (coupon.endsAt && new Date(coupon.endsAt) <= new Date(coupon.startsAt)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'End date must be after start date' });
  }
  if (coupon.discountType !== 'buy_x_get_y' && coupon.scope !== 'cart' && (!coupon.targetIds || coupon.targetIds.length === 0)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['targetIds'], message: 'Select at least one eligible target' });
  }
});

export const createDiscountSchema = z.object({
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
    scope: z.enum(['cart', 'category', 'product', 'variant']).default('cart'),
    targetIds: z.array(z.string().length(24)).optional(),
    minOrderSubtotal: z.number().min(0).optional(),
  }).optional(),
  customerRoles: z.array(z.string()).optional(),
  customerIds: z.array(z.string().length(24)).optional(),
  bannerUrl: z.string().url().optional(),
  badgeText: z.string().max(30).optional(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
}).superRefine((discount, ctx) => {
  if (discount.endsAt && new Date(discount.endsAt) <= new Date(discount.startsAt)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endsAt'], message: 'End date must be after start date' });
  }
  if (discount.type === 'coupon' && discount.coupons.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['coupons'], message: 'Add at least one discount code' });
  }
  if (discount.type !== 'coupon' && !discount.autoRule) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['autoRule'], message: 'Automatic discounts require a rule' });
  }
});

export const updateDiscountSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(1000).optional(),
  status: z.enum(['draft', 'active', 'paused', 'ended']).optional(),
  startsAt: z.string().datetime().optional(),
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

export type CreateDiscountDTO = z.infer<typeof createDiscountSchema>;
export type UpdateDiscountDTO = z.infer<typeof updateDiscountSchema>;
export type CouponDTO = z.infer<typeof couponSchema>;
export type ValidateCouponDTO = z.infer<typeof validateCouponSchema>;
