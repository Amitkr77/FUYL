import { z } from 'zod';
import { RewardType, FraudReason } from '../../../shared/enums';

export const createCampaignSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  referrerReward: z.object({
    type: z.enum([RewardType.WALLET_CREDIT, RewardType.COUPON, RewardType.CASHBACK]),
    amount: z.number().min(0),
    couponCode: z.string().optional(),
  }),
  refereeReward: z.object({
    type: z.enum([RewardType.WALLET_CREDIT, RewardType.COUPON, RewardType.CASHBACK]),
    amount: z.number().min(0),
    couponCode: z.string().optional(),
  }),
  rewardTrigger: z.enum(['signup', 'order_placed', 'order_completed']).default('order_completed'),
  maxReferralsPerReferrer: z.number().int().min(0).default(0),
  maxTotalReferrals: z.number().int().min(0).default(0),
  milestoneBonuses: z.array(z.object({
    threshold: z.number().int().min(1),
    bonusAmount: z.number().min(0),
  })).default([]),
});

export const updateCampaignSchema = createCampaignSchema.partial();

export const applyCodeSchema = z.object({
  code: z.string().min(4).max(50).trim().toLowerCase(),
  deviceFingerprint: z.string().max(256).optional(),
  ipHash: z.string().max(64).optional(),
  phoneHash: z.string().max(64).optional(),
  upiHandle: z.string().max(100).optional(),
});

export const reviewFraudSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  note: z.string().max(500).optional(),
});

export const shareSchema = z.object({
  channel: z.enum(['whatsapp', 'email', 'sms', 'link']),
  to: z.string().optional(),
});

export type CreateCampaignDTO = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignDTO = z.infer<typeof updateCampaignSchema>;
export type ApplyCodeDTO = z.infer<typeof applyCodeSchema>;
export type ReviewFraudDTO = z.infer<typeof reviewFraudSchema>;
export type ShareDTO = z.infer<typeof shareSchema>;
