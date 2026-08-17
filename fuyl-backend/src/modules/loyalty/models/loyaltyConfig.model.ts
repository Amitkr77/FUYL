import mongoose, { Document, Schema } from 'mongoose';

export type EligibleBase =
  | 'original_subtotal'
  | 'discounted_subtotal'
  | 'order_total'
  | 'order_total_excl_shipping'
  | 'amount_paid';

export interface ILoyaltyConfig extends Document {
  /** ₹ amount that earns points (e.g. spend ₹100 to earn points). */
  earnSpend: number;
  /** Points earned per earnSpend (e.g. 10 points per ₹100). */
  earnPoints: number;
  /** Points needed per redemption unit (e.g. 100 points = ₹10). */
  redeemPoints: number;
  /** ₹ value per redeemPoints block. */
  redeemValue: number;
  /** Minimum points balance required before the user can redeem anything. */
  minRedeemPoints: number;
  /** Maximum points redeemable per order. 0 = unlimited. */
  maxRedeemPointsPerOrder: number;
  /** Maximum % of order total payable via points. 0 = unlimited. */
  maxRedeemPercent: number;
  /** Whether a user may redeem fewer than maxRedeemPointsPerOrder points. */
  allowPartialRedemption: boolean;
  /** Which order value field is used as the earn base. */
  eligibleBase: EligibleBase;
  includeShipping: boolean;
  includeTax: boolean;
  includeWalletPaid: boolean;
  /** Days until earned points expire. 0 = never. */
  pointExpiryDays: number;
  /** Reverse earned points when order is cancelled. */
  reverseOnCancel: boolean;
  /** Reverse earned points when order is refunded. */
  reverseOnRefund: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const loyaltyConfigSchema = new Schema<ILoyaltyConfig>(
  {
    earnSpend:               { type: Number, required: true, min: 1, default: 100 },
    earnPoints:              { type: Number, required: true, min: 1, default: 10 },
    redeemPoints:            { type: Number, required: true, min: 1, default: 100 },
    redeemValue:             { type: Number, required: true, min: 0, default: 10 },
    minRedeemPoints:         { type: Number, required: true, min: 0, default: 500 },
    maxRedeemPointsPerOrder: { type: Number, required: true, min: 0, default: 0 },
    maxRedeemPercent:        { type: Number, required: true, min: 0, max: 100, default: 0 },
    allowPartialRedemption:  { type: Boolean, default: true },
    eligibleBase: {
      type: String,
      enum: ['original_subtotal', 'discounted_subtotal', 'order_total', 'order_total_excl_shipping', 'amount_paid'],
      default: 'discounted_subtotal',
    },
    includeShipping:  { type: Boolean, default: false },
    includeTax:       { type: Boolean, default: false },
    includeWalletPaid: { type: Boolean, default: false },
    pointExpiryDays:  { type: Number, default: 365, min: 0 },
    reverseOnCancel:  { type: Boolean, default: true },
    reverseOnRefund:  { type: Boolean, default: true },
    isActive:         { type: Boolean, default: true },
  },
  { timestamps: true }
);

loyaltyConfigSchema.index({ isActive: 1, updatedAt: -1 });

export const LoyaltyConfigModel = mongoose.model<ILoyaltyConfig>('LoyaltyConfig', loyaltyConfigSchema);
