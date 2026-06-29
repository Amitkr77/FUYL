import mongoose, { Schema, Document } from 'mongoose';
import { RewardType } from '../../../shared/enums';

export interface IReferralCampaign extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  startsAt: Date;
  endsAt?: Date;
  referrerReward: {
    type: typeof RewardType[keyof typeof RewardType];
    amount: number;
    couponCode?: string;
  };
  refereeReward: {
    type: typeof RewardType[keyof typeof RewardType];
    amount: number;
    couponCode?: string;
  };
  rewardTrigger: 'signup' | 'order_placed' | 'order_completed';
  maxReferralsPerReferrer: number;     // 0 = unlimited
  maxTotalReferrals: number;            // 0 = unlimited
  milestoneBonuses: Array<{
    threshold: number;
    bonusAmount: number;
  }>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralCampaignSchema = new Schema<IReferralCampaign>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
    startsAt: { type: Date, default: Date.now },
    endsAt: { type: Date },
    referrerReward: {
      type: { type: String, enum: Object.values(RewardType), required: true },
      amount: { type: Number, required: true, min: 0 },
      couponCode: { type: String },
    },
    refereeReward: {
      type: { type: String, enum: Object.values(RewardType), required: true },
      amount: { type: Number, required: true, min: 0 },
      couponCode: { type: String },
    },
    rewardTrigger: { type: String, enum: ['signup', 'order_placed', 'order_completed'], default: 'order_completed' },
    maxReferralsPerReferrer: { type: Number, default: 0 },
    maxTotalReferrals: { type: Number, default: 0 },
    milestoneBonuses: [{
      threshold: { type: Number, required: true },
      bonusAmount: { type: Number, required: true },
    }],
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const ReferralCampaignModel = mongoose.model<IReferralCampaign>(
  'ReferralCampaign',
  ReferralCampaignSchema,
  'referral_campaigns'
);
