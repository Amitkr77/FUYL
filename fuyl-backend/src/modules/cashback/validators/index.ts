import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-f]{24}$/i, 'Invalid ObjectId');

// Base object — used for both create (with refinements) and update (partial, no mode change)
const policyBaseSchema = z.object({
  name:            z.string().min(1).max(120),
  description:     z.string().max(500).optional(),
  mode:            z.enum(['standalone', 'attached']),
  couponCode:      z.string().min(1).max(30).regex(/^[A-Z0-9_-]+$/i, 'Coupon code must be alphanumeric').optional(),
  type:            z.enum(['percentage', 'flat']),
  value:           z.number().positive(),
  maxCap:          z.number().positive().optional(),
  minOrderAmount:  z.number().min(0).optional(),
  scope:           z.enum(['all', 'specific_products', 'specific_categories']).default('all'),
  scopeIds:        z.array(objectId).default([]),
  creditTiming:    z.enum(['on_order', 'on_delivery', 'after_days']).default('on_delivery'),
  creditAfterDays: z.number().int().positive().optional(),
  expiryDays:      z.number().int().positive().default(90),
  isActive:        z.boolean().default(true),
  startDate:       z.coerce.date().optional(),
  endDate:         z.coerce.date().optional(),
  maxUsesPerUser:  z.number().int().min(0).default(0),
  totalBudget:     z.number().min(0).default(0),
  allowedUserIds:  z.array(objectId).optional().default([]),
});

// Create: full validation with cross-field refinements
export const createPolicySchema = policyBaseSchema
  .refine(
    (d) => d.mode !== 'attached' || !!d.couponCode,
    { message: 'couponCode is required for attached mode', path: ['couponCode'] }
  )
  .refine(
    (d) => d.creditTiming !== 'after_days' || (d.creditAfterDays !== undefined && d.creditAfterDays > 0),
    { message: 'creditAfterDays is required when creditTiming is after_days', path: ['creditAfterDays'] }
  )
  .refine(
    (d) => !d.startDate || !d.endDate || d.endDate > d.startDate,
    { message: 'endDate must be after startDate', path: ['endDate'] }
  )
  .refine(
    (d) => d.type !== 'percentage' || d.value <= 100,
    { message: 'Percentage value cannot exceed 100', path: ['value'] }
  );

// Update: partial on the base object (mode cannot be changed after creation)
export const updatePolicySchema = policyBaseSchema.partial().omit({ mode: true });

export const listPoliciesSchema = z.object({
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().positive().max(100).default(20),
  isActive: z.enum(['true', 'false']).optional(),
  mode:     z.enum(['standalone', 'attached']).optional(),
});

export const listEarningsSchema = z.object({
  page:    z.coerce.number().int().positive().default(1),
  limit:   z.coerce.number().int().positive().max(100).default(20),
  status:  z.enum(['pending', 'credited', 'reversed', 'expired']).optional(),
  userId:  objectId.optional(),
  orderId: objectId.optional(),
});

export type CreatePolicyDTO  = z.infer<typeof createPolicySchema>;
export type UpdatePolicyDTO  = z.infer<typeof updatePolicySchema>;
export type ListPoliciesDTO  = z.infer<typeof listPoliciesSchema>;
export type ListEarningsDTO  = z.infer<typeof listEarningsSchema>;
