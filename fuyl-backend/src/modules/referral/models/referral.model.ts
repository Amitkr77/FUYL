import mongoose, { Schema, Document } from 'mongoose';
import { ReferralStatus } from '../../../shared/enums';

export interface IReferral extends Document {
  referrerId: mongoose.Types.ObjectId;
  refereeId: mongoose.Types.ObjectId;
  code: string;
  campaignId?: mongoose.Types.ObjectId;
  status: typeof ReferralStatus[keyof typeof ReferralStatus];
  sharedAt: Date;
  appliedAt?: Date;
  signupAt?: Date;
  firstOrderAt?: Date;
  firstOrderId?: mongoose.Types.ObjectId;
  eligibleAt?: Date;
  rewardedAt?: Date;
  completedAt?: Date;
  rejectedAt?: Date;
  rejectedReason?: string;
  rewardReferrerId?: mongoose.Types.ObjectId;
  rewardRefereeId?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralSchema = new Schema<IReferral>(
  {
    referrerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refereeId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    code: { type: String, required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'ReferralCampaign' },
    status: { type: String, enum: Object.values(ReferralStatus), default: ReferralStatus.SHARED, index: true },
    sharedAt: { type: Date, default: Date.now },
    appliedAt: { type: Date },
    signupAt: { type: Date },
    firstOrderAt: { type: Date },
    firstOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    eligibleAt: { type: Date },
    rewardedAt: { type: Date },
    completedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectedReason: { type: String },
    rewardReferrerId: { type: Schema.Types.ObjectId, ref: 'ReferralReward' },
    rewardRefereeId: { type: Schema.Types.ObjectId, ref: 'ReferralReward' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// A referee can have at most ONE referral applied
ReferralSchema.index({ refereeId: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['applied', 'pending', 'eligible', 'rewarded', 'completed'] } } });
ReferralSchema.index({ referrerId: 1, status: 1 });

export const ReferralModel = mongoose.model<IReferral>('Referral', ReferralSchema, 'referrals');
