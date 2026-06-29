import mongoose, { Schema, Document, Types } from 'mongoose';

export type RedemptionStatus = 'applied' | 'reverted' | 'expired';

export interface ICouponRedemption extends Document {
  couponCode: string;
  campaignId?: Types.ObjectId;
  userId: Types.ObjectId;
  orderId?: Types.ObjectId;
  cartId?: Types.ObjectId;
  discountType: string;
  discountAmount: number;
  currency: string;
  status: RedemptionStatus;
  appliedAt: Date;
  revertedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const CouponRedemptionSchema = new Schema<ICouponRedemption>(
  {
    couponCode: { type: String, required: true, uppercase: true, trim: true, index: true },
    campaignId: { type: Schema.Types.ObjectId, ref: 'Campaign', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', index: true, sparse: true },
    cartId: { type: Schema.Types.ObjectId, ref: 'Cart', index: true, sparse: true },
    discountType: { type: String, required: true },
    discountAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    status: { type: String, enum: ['applied', 'reverted', 'expired'], default: 'applied', index: true },
    appliedAt: { type: Date, default: Date.now },
    revertedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

CouponRedemptionSchema.index({ userId: 1, couponCode: 1, status: 1 });
CouponRedemptionSchema.index({ orderId: 1 });

export const CouponRedemptionModel = mongoose.model<ICouponRedemption>(
  'CouponRedemption',
  CouponRedemptionSchema,
  'coupon_redemptions'
);
