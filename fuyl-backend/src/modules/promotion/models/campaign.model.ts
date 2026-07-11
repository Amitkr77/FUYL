import mongoose, { Schema, Document, Types } from 'mongoose';

export type DiscountType = 'percent' | 'flat' | 'per_unit' | 'free_shipping';
export type CouponScope = 'cart' | 'category' | 'product' | 'variant' | 'seller';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'ended';

export interface ICoupon {
  code: string;                       // uppercase, unique
  discountType: DiscountType;
  discountValue: number;              // percent (0-100) or flat currency amount
  scope: CouponScope;
  // Scope target IDs (depending on scope)
  targetIds?: Types.ObjectId[];
  // Model that targetIds points into; derived from `scope`, see pre-validate hook below
  couponTargetRef?: 'Category' | 'Product' | 'Variant' | 'User';
  currency?: string;                  // for flat discounts
  // Limits
  maxRedemptionsGlobal?: number;
  maxRedemptionsPerUser?: number;
  minOrderSubtotal?: number;
  maxDiscountAmount?: number;         // cap for percent discounts
  // Validity
  startsAt: Date;
  endsAt?: Date;
  // Tracking
  redemptionsCount: number;
  isFirstOrderOnly?: boolean;
  isReferralReward?: boolean;
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

export interface ICampaign extends Document {
  name: string;
  description?: string;
  status: CampaignStatus;
  type: 'coupon' | 'automatic' | 'bundle' | 'flash_sale';
  startsAt: Date;
  endsAt?: Date;
  coupons: ICoupon[];
  // For automatic / bundle / flash_sale types
  autoRule?: {
    discountType: DiscountType;
    discountValue: number;
    scope: CouponScope;
    targetIds?: Types.ObjectId[];
    minOrderSubtotal?: number;
  };
  // Audience targeting
  customerRoles?: string[];
  customerIds?: Types.ObjectId[];
  // Display
  bannerUrl?: string;
  badgeText?: string;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    discountType: { type: String, enum: ['percent', 'flat', 'per_unit', 'free_shipping'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    scope: { type: String, enum: ['cart', 'category', 'product', 'variant', 'seller'], default: 'cart' },
    targetIds: [{ type: Schema.Types.ObjectId, refPath: 'couponTargetRef' }],
    couponTargetRef: { type: String, enum: ['Category', 'Product', 'Variant', 'User'] },
    currency: { type: String, default: 'INR' },
    maxRedemptionsGlobal: { type: Number, min: 0 },
    maxRedemptionsPerUser: { type: Number, min: 0, default: 1 },
    minOrderSubtotal: { type: Number, min: 0 },
    maxDiscountAmount: { type: Number, min: 0 },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date },
    redemptionsCount: { type: Number, default: 0, min: 0 },
    isFirstOrderOnly: { type: Boolean, default: false },
    isReferralReward: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: true, timestamps: true }
);

const COUPON_TARGET_REF_BY_SCOPE: Partial<Record<CouponScope, ICoupon['couponTargetRef']>> = {
  category: 'Category',
  product: 'Product',
  variant: 'Variant',
  seller: 'User',
};

CouponSchema.pre('validate', function (next) {
  this.couponTargetRef = COUPON_TARGET_REF_BY_SCOPE[this.scope];
  next();
});

const CampaignSchema = new Schema<ICampaign>(
  {
    name: { type: String, required: true, trim: true, index: true },
    description: { type: String, maxlength: 1000 },
    status: { type: String, enum: ['draft', 'active', 'paused', 'ended'], default: 'draft', index: true },
    type: { type: String, enum: ['coupon', 'automatic', 'bundle', 'flash_sale'], default: 'coupon', index: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, index: true },
    coupons: [CouponSchema],
    autoRule: {
      discountType: { type: String, enum: ['percent', 'flat', 'per_unit', 'free_shipping'] },
      discountValue: { type: Number, min: 0 },
      scope: { type: String, enum: ['cart', 'category', 'product', 'variant', 'seller'] },
      targetIds: [{ type: Schema.Types.ObjectId }],
      minOrderSubtotal: { type: Number, min: 0 },
    },
    customerRoles: [{ type: String }],
    customerIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    bannerUrl: { type: String },
    badgeText: { type: String, maxlength: 30 },
    isFeatured: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

CampaignSchema.index({ status: 1, isActive: 1, startsAt: 1, endsAt: 1 });

export const CampaignModel = mongoose.model<ICampaign>('Campaign', CampaignSchema, 'promotion_campaigns');
