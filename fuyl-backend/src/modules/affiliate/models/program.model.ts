import mongoose, { Schema, Document } from 'mongoose';

export interface ICommissionTier {
  minOrderAmount: number;
  rate: number; // percentage
}

export interface IAffiliateProgram extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  isDefault: boolean;
  // Base commission rate as a percentage of commissionBase (e.g. 10 = 10%)
  defaultRate: number;
  // What amount the commission is calculated on
  commissionBase: 'subtotal' | 'grand_total';
  // How long attribution persists in days
  attributionWindowDays: number;
  // Optional tiered rates — if order subtotal exceeds a threshold, use that tier's rate
  tiers: ICommissionTier[];
  // Minimum payout threshold in rupees
  minPayoutAmount: number;
  // Days after order completion before a PENDING commission can be approved
  autoApproveAfterDays: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const CommissionTierSchema = new Schema<ICommissionTier>(
  {
    minOrderAmount: { type: Number, required: true, min: 0 },
    rate:           { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false }
);

const AffiliateProgramSchema = new Schema<IAffiliateProgram>(
  {
    name:                  { type: String, required: true, trim: true },
    description:           { type: String, trim: true },
    isActive:              { type: Boolean, default: true, index: true },
    isDefault:             { type: Boolean, default: false, index: true },
    defaultRate:           { type: Number, required: true, min: 0, max: 100 },
    commissionBase:        { type: String, enum: ['subtotal', 'grand_total'], default: 'subtotal' },
    attributionWindowDays: { type: Number, default: 30, min: 1 },
    tiers:                 { type: [CommissionTierSchema], default: [] },
    minPayoutAmount:       { type: Number, default: 500, min: 0 },
    autoApproveAfterDays:  { type: Number, default: 7, min: 0 },
    metadata:              { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

AffiliateProgramSchema.index({ isDefault: 1 }, { unique: true, partialFilterExpression: { isDefault: true } });

export const AffiliateProgramModel = mongoose.model<IAffiliateProgram>(
  'AffiliateProgram',
  AffiliateProgramSchema,
  'affiliate_programs'
);
