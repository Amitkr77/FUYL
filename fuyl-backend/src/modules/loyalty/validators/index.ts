import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid ObjectId');

// ─── Config schemas ───────────────────────────────────────────────────────────

export const createConfigSchema = z.object({
  earnSpend:               z.number().positive().default(100),
  earnPoints:              z.number().int().positive().default(10),
  redeemPoints:            z.number().int().positive().default(100),
  redeemValue:             z.number().min(0).default(10),
  minRedeemPoints:         z.number().int().min(0).default(500),
  maxRedeemPointsPerOrder: z.number().int().min(0).default(0),
  maxRedeemPercent:        z.number().min(0).max(100).default(0),
  allowPartialRedemption:  z.boolean().default(true),
  eligibleBase: z
    .enum(['original_subtotal', 'discounted_subtotal', 'order_total', 'order_total_excl_shipping', 'amount_paid'])
    .default('discounted_subtotal'),
  includeShipping:         z.boolean().default(false),
  includeTax:              z.boolean().default(false),
  includeWalletPaid:       z.boolean().default(false),
  pointExpiryDays:         z.number().int().min(0).default(365),
  reverseOnCancel:         z.boolean().default(true),
  reverseOnRefund:         z.boolean().default(true),
  isActive:                z.boolean().default(true),
});

export const updateConfigSchema = createConfigSchema.partial();

// ─── Admin adjust schema ──────────────────────────────────────────────────────

export const adminAdjustSchema = z.object({
  userId:      objectId,
  points:      z.number().int().refine((n) => n !== 0, { message: 'Points must be non-zero' }),
  description: z.string().min(1).max(500),
});

// ─── Query / list schemas ─────────────────────────────────────────────────────

export const listTransactionsSchema = z.object({
  userId: objectId.optional(),
  page:   z.coerce.number().int().positive().default(1),
  limit:  z.coerce.number().int().positive().max(100).default(20),
});

export const previewRedemptionSchema = z.object({
  orderTotal: z.coerce.number().min(0),
});

// ─── Exported DTO types ───────────────────────────────────────────────────────

export type CreateConfigDTO      = z.infer<typeof createConfigSchema>;
export type UpdateConfigDTO      = z.infer<typeof updateConfigSchema>;
export type AdminAdjustDTO       = z.infer<typeof adminAdjustSchema>;
export type ListTransactionsDTO  = z.infer<typeof listTransactionsSchema>;
export type PreviewRedemptionDTO = z.infer<typeof previewRedemptionSchema>;
