import mongoose, { Schema, Document } from 'mongoose';
import { RewardType } from '../../../shared/enums';

export interface IReferralReward extends Document {
  referralId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  role: 'referrer' | 'referee';
  type: typeof RewardType[keyof typeof RewardType];
  amount: number;
  currency: string;
  walletTransactionId?: mongoose.Types.ObjectId;
  couponCode?: string;
  expiresAt?: Date;
  isReversed: boolean;
  reversedAt?: Date;
  reversedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralRewardSchema = new Schema<IReferralReward>(
  {
    referralId: { type: Schema.Types.ObjectId, ref: 'Referral', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['referrer', 'referee'], required: true },
    type: { type: String, enum: Object.values(RewardType), required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    walletTransactionId: { type: Schema.Types.ObjectId, ref: 'WalletTransaction' },
    couponCode: { type: String },
    expiresAt: { type: Date },
    isReversed: { type: Boolean, default: false, index: true },
    reversedAt: { type: Date },
    reversedReason: { type: String },
  },
  { timestamps: true }
);

ReferralRewardSchema.index({ userId: 1, isReversed: 1 });

export const ReferralRewardModel = mongoose.model<IReferralReward>(
  'ReferralReward',
  ReferralRewardSchema,
  'referral_rewards'
);
