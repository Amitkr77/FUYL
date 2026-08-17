import mongoose, { Document, Schema } from 'mongoose';

export type EarningStatus = 'pending' | 'processing' | 'credited' | 'reversed' | 'expired';

export interface ICashbackEarning extends Document {
  orderId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  /** Null for legacy/hardcoded cashback that predates policies. */
  policyId?: mongoose.Types.ObjectId;
  /** The base amount on which cashback was calculated:
   *  pre-discount subtotal minus the wallet-paid portion (Option B). */
  cashbackBase: number;
  cashbackAmount: number;
  status: EarningStatus;
  creditTiming: string;
  creditAfterDays?: number;
  /** Absolute datetime when the credit should fire. */
  scheduledCreditAt: Date;
  creditedAt?: Date;
  walletTransactionId?: mongoose.Types.ObjectId;
  /** Expiry to stamp on the wallet credit transaction. */
  expiresAt?: Date;
  /** The coupon code that triggered an 'attached' policy. */
  couponCode?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const cashbackEarningSchema = new Schema<ICashbackEarning>(
  {
    orderId:             { type: Schema.Types.ObjectId, required: true, ref: 'Order', index: true },
    userId:              { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    policyId:            { type: Schema.Types.ObjectId, ref: 'CashbackPolicy' },
    cashbackBase:        { type: Number, required: true, min: 0 },
    cashbackAmount:      { type: Number, required: true, min: 0 },
    status:              { type: String, enum: ['pending', 'processing', 'credited', 'reversed', 'expired'], default: 'pending' },
    creditTiming:        { type: String, required: true },
    creditAfterDays:     { type: Number },
    scheduledCreditAt:   { type: Date, required: true, index: true },
    creditedAt:          { type: Date },
    walletTransactionId: { type: Schema.Types.ObjectId, ref: 'WalletTransaction' },
    expiresAt:           { type: Date },
    couponCode:          { type: String, trim: true, uppercase: true },
    metadata:            { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

cashbackEarningSchema.index({ status: 1, scheduledCreditAt: 1 }); // for cron job queries
cashbackEarningSchema.index({ orderId: 1, policyId: 1 }, { unique: true, sparse: true }); // prevent duplicate earning per order+policy

export const CashbackEarningModel = mongoose.model<ICashbackEarning>('CashbackEarning', cashbackEarningSchema);
