import { z } from 'zod';
import { SubscriptionInterval, PaymentMethod } from '../../../shared/enums';

export const createPlanSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  interval: z.enum([
    SubscriptionInterval.DAILY,
    SubscriptionInterval.WEEKLY,
    SubscriptionInterval.BIWEEKLY,
    SubscriptionInterval.MONTHLY,
    SubscriptionInterval.QUARTERLY,
    SubscriptionInterval.CUSTOM,
  ]),
  intervalCount: z.number().int().min(1).max(52).default(1),
  discountPercent: z.number().min(0).max(100).default(0),
  freeShipping: z.boolean().default(false),
  priceLock: z.boolean().default(false),
  maxSkipCount: z.number().int().min(0).max(52).default(4),
  isActive: z.boolean().default(true),
});

export const updatePlanSchema = createPlanSchema.partial();

export const createSubscriptionSchema = z.object({
  productId: z.string().length(24),
  variantId: z.string().length(24).optional(),
  planId: z.string().length(24),
  quantity: z.number().int().min(1).max(99).default(1),
  paymentMethod: z.enum([
    PaymentMethod.RAZORPAY,
    PaymentMethod.UPI,
    PaymentMethod.COD,
    PaymentMethod.WALLET,
  ]),
  addressId: z.string().length(24).optional(),
});

export const updateFrequencySchema = z.object({
  interval: z.enum([
    SubscriptionInterval.DAILY,
    SubscriptionInterval.WEEKLY,
    SubscriptionInterval.BIWEEKLY,
    SubscriptionInterval.MONTHLY,
    SubscriptionInterval.QUARTERLY,
  ]),
  intervalCount: z.number().int().min(1).max(52).default(1),
});

export const cancelSubscriptionSchema = z.object({
  cancelAtCycle: z.boolean().default(false),
  reason: z.string().max(500).optional(),
});

export const pauseScheduleSchema = z.object({
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional(),
  reason: z.string().max(500).optional(),
}).refine((d) => !d.endDate || d.endDate > d.startDate, {
  message: 'endDate must be after startDate',
  path: ['endDate'],
});

export const skipDeliverySchema = z.object({
  cycleNumber: z.number().int().min(1).optional(),
});

export type CreatePlanDTO = z.infer<typeof createPlanSchema>;
export type UpdatePlanDTO = z.infer<typeof updatePlanSchema>;
export type CreateSubscriptionDTO = z.infer<typeof createSubscriptionSchema>;
export type UpdateFrequencyDTO = z.infer<typeof updateFrequencySchema>;
export type CancelSubscriptionDTO = z.infer<typeof cancelSubscriptionSchema>;
export type PauseScheduleDTO = z.infer<typeof pauseScheduleSchema>;
export type SkipDeliveryDTO = z.infer<typeof skipDeliverySchema>;
