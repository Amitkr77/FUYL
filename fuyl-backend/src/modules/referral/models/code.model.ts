import mongoose, { Schema, Document } from 'mongoose';

export interface IReferralCode extends Document {
  code: string;                    // unique, lowercase, e.g. {username}-{nanoid6}
  referrerId: mongoose.Types.ObjectId;
  campaignId?: mongoose.Types.ObjectId;
  expiresAt?: Date;
  maxUses: number;                 // 0 = unlimited
  usesCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralCodeSchema = new Schema<IReferralCode>(
  {
    code: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    referrerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'ReferralCampaign' },
    expiresAt: { type: Date },
    maxUses: { type: Number, default: 0 },
    usesCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

ReferralCodeSchema.index({ referrerId: 1, isActive: 1 });

export const ReferralCodeModel = mongoose.model<IReferralCode>(
  'ReferralCode',
  ReferralCodeSchema,
  'referral_codes'
);
