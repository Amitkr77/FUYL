import mongoose, { Document, Schema } from 'mongoose';

export type CashbackType = 'percentage' | 'flat';
export type CashbackMode = 'standalone' | 'attached';
export type CreditTiming = 'on_order' | 'on_delivery' | 'after_days';
export type CashbackScope = 'all' | 'specific_products' | 'specific_categories';

export interface ICashbackPolicy extends Document {
  name: string;
  description?: string;
  mode: CashbackMode;
  /** Required when mode === 'attached' — links this policy to a coupon code. */
  couponCode?: string;
  type: CashbackType;
  /** Percentage (e.g. 5 for 5%) or flat amount in INR. */
  value: number;
  /** Maximum cashback per order in INR. No limit when undefined. */
  maxCap?: number;
  /** Minimum order amount (after discounts, excluding wallet payment) to qualify. */
  minOrderAmount?: number;
  scope: CashbackScope;
  /** Product or category ObjectId strings when scope !== 'all'. */
  scopeIds: string[];
  creditTiming: CreditTiming;
  /** Used only when creditTiming === 'after_days'. */
  creditAfterDays?: number;
  /** Wallet credit expires after N days. Defaults to 90. */
  expiryDays: number;
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
  /** Max times any single user can earn from this policy. 0 = unlimited. */
  maxUsesPerUser: number;
  /** Total cashback budget for this policy in INR. 0 = unlimited. */
  totalBudget: number;
  /** Running total of cashback credited so far. */
  usedBudget: number;
  createdAt: Date;
  updatedAt: Date;
}

const cashbackPolicySchema = new Schema<ICashbackPolicy>(
  {
    name:            { type: String, required: true, trim: true },
    description:     { type: String, trim: true },
    mode:            { type: String, enum: ['standalone', 'attached'], required: true },
    couponCode:      { type: String, trim: true, uppercase: true },
    type:            { type: String, enum: ['percentage', 'flat'], required: true },
    value:           { type: Number, required: true, min: 0 },
    maxCap:          { type: Number, min: 0 },
    minOrderAmount:  { type: Number, min: 0 },
    scope:           { type: String, enum: ['all', 'specific_products', 'specific_categories'], default: 'all' },
    scopeIds:        [{ type: String }],
    creditTiming:    { type: String, enum: ['on_order', 'on_delivery', 'after_days'], default: 'on_delivery' },
    creditAfterDays: { type: Number, min: 1 },
    expiryDays:      { type: Number, default: 90, min: 1 },
    isActive:        { type: Boolean, default: true },
    startDate:       { type: Date },
    endDate:         { type: Date },
    maxUsesPerUser:  { type: Number, default: 0, min: 0 },
    totalBudget:     { type: Number, default: 0, min: 0 },
    usedBudget:      { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

cashbackPolicySchema.index({ mode: 1, isActive: 1 });
cashbackPolicySchema.index({ couponCode: 1 }, { sparse: true });

export const CashbackPolicyModel = mongoose.model<ICashbackPolicy>('CashbackPolicy', cashbackPolicySchema);
