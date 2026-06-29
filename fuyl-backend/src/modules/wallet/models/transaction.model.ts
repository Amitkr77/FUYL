import mongoose, { Schema, Document } from 'mongoose';

export type WalletTxType =
  | 'credit'           // money added
  | 'debit'            // money spent
  | 'hold'             // reserved for in-progress order
  | 'release'          // hold released back to balance
  | 'reverse';         // reversal of a previous credit

export type WalletTxSource =
  | 'referral'
  | 'subscription_cashback'
  | 'order_cashback'
  | 'order_payment'
  | 'order_refund'
  | 'promotion'
  | 'gift_card'
  | 'topup'
  | 'withdrawal'
  | 'admin_adjustment'
  | 'milestone_bonus'
  | 'reversal';

export interface IWalletTransaction extends Document {
  walletId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: WalletTxType;
  source: WalletTxSource;
  amount: number;
  currency: string;
  balanceBefore: number;
  balanceAfter: number;
  referenceType?: string;       // 'order' | 'subscription' | 'referral' | 'reward' | 'gift_card'
  referenceId?: mongoose.Types.ObjectId;
  description: string;
  expiresAt?: Date;             // for time-bounded credits (e.g. referral rewards)
  isReversed: boolean;
  reversedByTxId?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    walletId: { type: Schema.Types.ObjectId, ref: 'Wallet', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['credit', 'debit', 'hold', 'release', 'reverse'], required: true, index: true },
    source: {
      type: String,
      enum: ['referral', 'subscription_cashback', 'order_cashback', 'order_payment', 'order_refund',
             'promotion', 'gift_card', 'topup', 'withdrawal', 'admin_adjustment', 'milestone_bonus', 'reversal'],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    referenceType: { type: String },
    referenceId: { type: Schema.Types.ObjectId, refPath: 'referenceType' },
    description: { type: String, required: true },
    expiresAt: { type: Date, index: true },
    isReversed: { type: Boolean, default: false, index: true },
    reversedByTxId: { type: Schema.Types.ObjectId, ref: 'WalletTransaction' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

WalletTransactionSchema.index({ userId: 1, createdAt: -1 });
WalletTransactionSchema.index({ referenceType: 1, referenceId: 1 });

export const WalletTransactionModel = mongoose.model<IWalletTransaction>(
  'WalletTransaction',
  WalletTransactionSchema,
  'wallet_transactions'
);
