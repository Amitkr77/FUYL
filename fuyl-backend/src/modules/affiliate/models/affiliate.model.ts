import mongoose, { Schema, Document } from 'mongoose';
import { AffiliateStatus } from '../../../shared/enums';

export interface IAffiliate extends Document {
  // Optional link to a User account (they can have an account or just a portal login)
  userId?: mongoose.Types.ObjectId;
  programId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  // How they promote: Instagram handle, YouTube channel, blog URL, etc.
  channels: string[];
  status: typeof AffiliateStatus[keyof typeof AffiliateStatus];
  rejectedReason?: string;
  approvedAt?: Date;
  rejectedAt?: Date;
  suspendedAt?: Date;
  suspendedReason?: string;
  // Bank / UPI for payouts (stored as opaque string — not validated here)
  paymentInfo?: {
    upi?: string;
    bankAccount?: string;
    ifsc?: string;
    accountName?: string;
  };
  // Running counters for the affiliate dashboard
  stats: {
    totalClicks: number;
    totalOrders: number;
    totalRevenue: number;
    totalCommissionEarned: number;
    totalCommissionPaid: number;
  };
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AffiliateSchema = new Schema<IAffiliate>(
  {
    userId:    { type: Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
    programId: { type: Schema.Types.ObjectId, ref: 'AffiliateProgram', required: true, index: true },
    name:      { type: String, required: true, trim: true },
    email:     { type: String, required: true, trim: true, lowercase: true, index: true },
    phone:     { type: String, trim: true },
    channels:  [{ type: String, trim: true }],
    status:    { type: String, enum: Object.values(AffiliateStatus), default: AffiliateStatus.PENDING, index: true },
    rejectedReason:   { type: String },
    approvedAt:       { type: Date },
    rejectedAt:       { type: Date },
    suspendedAt:      { type: Date },
    suspendedReason:  { type: String },
    paymentInfo: {
      upi:         { type: String },
      bankAccount: { type: String },
      ifsc:        { type: String },
      accountName: { type: String },
    },
    stats: {
      totalClicks:              { type: Number, default: 0 },
      totalOrders:              { type: Number, default: 0 },
      totalRevenue:             { type: Number, default: 0 },
      totalCommissionEarned:    { type: Number, default: 0 },
      totalCommissionPaid:      { type: Number, default: 0 },
    },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

AffiliateSchema.index({ email: 1 }, { unique: true });

export const AffiliateModel = mongoose.model<IAffiliate>(
  'Affiliate',
  AffiliateSchema,
  'affiliates'
);
