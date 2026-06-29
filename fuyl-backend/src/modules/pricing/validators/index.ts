import { z } from 'zod';

export const priceBookEntrySchema = z.object({
  productId: z.string().length(24),
  variantId: z.string().length(24).optional(),
  price: z.number().min(0).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  currency: z.string().default('INR'),
});

export const volumeTierSchema = z.object({
  minQuantity: z.number().int().min(1),
  discountPercent: z.number().min(0).max(100),
  appliesToProductId: z.string().length(24).optional(),
});

export const createPriceBookSchema = z.object({
  name: z.string().min(2).max(120),
  type: z.enum(['sale', 'wholesale', 'subscription', 'clearance', 'loyalty']).default('sale'),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  description: z.string().max(500).optional(),
  priority: z.number().int().default(0),
  currency: z.string().default('INR'),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  sellerIds: z.array(z.string().length(24)).optional(),
  categoryIds: z.array(z.string().length(24)).optional(),
  customerRoles: z.array(z.string()).optional(),
  entries: z.array(priceBookEntrySchema).default([]),
  volumeTiers: z.array(volumeTierSchema).optional(),
});

export const updatePriceBookSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  status: z.enum(['draft', 'active', 'archived']).optional(),
  description: z.string().max(500).optional(),
  priority: z.number().int().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  sellerIds: z.array(z.string().length(24)).optional(),
  categoryIds: z.array(z.string().length(24)).optional(),
  customerRoles: z.array(z.string()).optional(),
  entries: z.array(priceBookEntrySchema).optional(),
  volumeTiers: z.array(volumeTierSchema).optional(),
  isActive: z.boolean().optional(),
});

export const createTaxRuleSchema = z.object({
  name: z.string().min(2).max(120),
  code: z.string().min(2).max(20).regex(/^[A-Z0-9-]+$/),
  type: z.enum(['flat', 'percent', 'per_unit']).default('percent'),
  rate: z.number().min(0),
  currency: z.string().default('INR'),
  description: z.string().max(500).optional(),
  categoryIds: z.array(z.string().length(24)).optional(),
  hsnCodes: z.array(z.string()).optional(),
  sellerIds: z.array(z.string().length(24)).optional(),
  states: z.array(z.string()).optional(),
  countries: z.array(z.string()).optional(),
  isCompound: z.boolean().default(false),
  isReverseCharge: z.boolean().default(false),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

export const updateTaxRuleSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  type: z.enum(['flat', 'percent', 'per_unit']).optional(),
  rate: z.number().min(0).optional(),
  currency: z.string().optional(),
  description: z.string().max(500).optional(),
  categoryIds: z.array(z.string().length(24)).optional(),
  hsnCodes: z.array(z.string()).optional(),
  sellerIds: z.array(z.string().length(24)).optional(),
  states: z.array(z.string()).optional(),
  countries: z.array(z.string()).optional(),
  isCompound: z.boolean().optional(),
  isReverseCharge: z.boolean().optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
});

export type CreatePriceBookDTO = z.infer<typeof createPriceBookSchema>;
export type UpdatePriceBookDTO = z.infer<typeof updatePriceBookSchema>;
export type CreateTaxRuleDTO = z.infer<typeof createTaxRuleSchema>;
export type UpdateTaxRuleDTO = z.infer<typeof updateTaxRuleSchema>;
