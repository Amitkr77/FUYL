import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * Per-(coupon, user) redemption counter. Exists so the per-user coupon limit
 * can be enforced with a single ATOMIC conditional increment ($inc guarded by
 * `count < max`) instead of a racy count-then-insert. The unique index doubles
 * as the enforcement mechanism: when the guarded increment can't match (user is
 * at the cap), the upsert falls back to an insert that trips the unique index,
 * which the repository treats as "limit reached".
 */
export interface ICouponUserRedemption extends Document {
  couponCode: string;
  userId: Types.ObjectId;
  count: number;
  createdAt: Date;
  updatedAt: Date;
}

const CouponUserRedemptionSchema = new Schema<ICouponUserRedemption>(
  {
    couponCode: { type: String, required: true, uppercase: true, trim: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    count: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

CouponUserRedemptionSchema.index({ couponCode: 1, userId: 1 }, { unique: true });

export const CouponUserRedemptionModel = mongoose.model<ICouponUserRedemption>(
  'CouponUserRedemption',
  CouponUserRedemptionSchema,
  'coupon_user_redemptions'
);
