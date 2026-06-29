import mongoose, { Schema, Document } from 'mongoose';
import { FraudReason } from '../../../shared/enums';

export interface IReferralFraudFlag extends Document {
  referralId: mongoose.Types.ObjectId;
  referrerId: mongoose.Types.ObjectId;
  refereeId: mongoose.Types.ObjectId;
  reasons: Array<typeof FraudReason[keyof typeof FraudReason]>;
  deviceFingerprint?: string;
  ipHash?: string;
  phoneHash?: string;
  upiHandle?: string;
  severity: 'low' | 'medium' | 'high';
  reviewedAt?: Date;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewDecision?: 'approved' | 'rejected';
  reviewNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralFraudFlagSchema = new Schema<IReferralFraudFlag>(
  {
    referralId: { type: Schema.Types.ObjectId, ref: 'Referral', required: true, index: true },
    referrerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    refereeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reasons: [{ type: String, enum: Object.values(FraudReason) }],
    deviceFingerprint: { type: String, index: true },
    ipHash: { type: String, index: true },
    phoneHash: { type: String, index: true },
    upiHandle: { type: String },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewDecision: { type: String, enum: ['approved', 'rejected'] },
    reviewNote: { type: String },
  },
  { timestamps: true }
);

ReferralFraudFlagSchema.index({ severity: 1, reviewedAt: 1 });

export const ReferralFraudFlagModel = mongoose.model<IReferralFraudFlag>(
  'ReferralFraudFlag',
  ReferralFraudFlagSchema,
  'referral_fraud_flags'
);
