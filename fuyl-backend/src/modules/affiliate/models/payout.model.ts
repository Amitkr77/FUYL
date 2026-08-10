import mongoose, { Schema, Document } from 'mongoose';

export type PayoutStatus = 'pending' | 'processing' | 'paid' | 'failed';

export interface IAffiliatePayout extends Document {
  affiliateId:   mongoose.Types.ObjectId;
  commissionIds: mongoose.Types.ObjectId[];
  amount:        number;
  status:        PayoutStatus;
  providerRef?:  string;
  paymentMethod: 'upi' | 'bank_transfer' | 'wallet_credit';
  paidAt?:       Date;
  failedAt?:     Date;
  failureReason?: string;
  initiatedBy:   mongoose.Types.ObjectId;
  metadata?:     Record<string, unknown>;
  createdAt:     Date;
  updatedAt:     Date;
}

const AffiliatePayoutSchema = new Schema<IAffiliatePayout>(
  {
    affiliateId:   { type: Schema.Types.ObjectId, ref: 'Affiliate', required: true, index: true },
    commissionIds: [{ type: Schema.Types.ObjectId, ref: 'Commission' }],
    amount:        { type: Number, required: true, min: 0 },
    status:        { type: String, enum: ['pending', 'processing', 'paid', 'failed'], default: 'pending', index: true },
    providerRef:   { type: String },
    paymentMethod: { type: String, enum: ['upi', 'bank_transfer', 'wallet_credit'], required: true },
    paidAt:        { type: Date },
    failedAt:      { type: Date },
    failureReason: { type: String },
    initiatedBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    metadata:      { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const AffiliatePayoutModel = mongoose.model<IAffiliatePayout>(
  'AffiliatePayout',
  AffiliatePayoutSchema,
  'affiliate_payouts'
);
