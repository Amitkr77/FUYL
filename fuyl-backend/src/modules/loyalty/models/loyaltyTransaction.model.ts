import mongoose, { Document, Schema, Types } from 'mongoose';

export type LoyaltyTransactionType = 'earn' | 'redeem' | 'reverse' | 'expire' | 'adjust';
export type LoyaltyReferenceType = 'order' | 'redemption' | 'admin' | 'expiry' | 'manual';

export interface ILoyaltyTransaction extends Document {
  userId: Types.ObjectId;
  type: LoyaltyTransactionType;
  /** Positive for earn; negative for redeem/reverse/expire. */
  points: number;
  balanceBefore: number;
  balanceAfter: number;
  referenceType: LoyaltyReferenceType;
  referenceId?: Types.ObjectId;
  description: string;
  /** When these specific points expire (used for earn transactions). */
  expiresAt?: Date;
  /** Whether this transaction has been reversed by a later one. */
  isReversed: boolean;
  /** The transaction ID that reversed this one. */
  reversedTxId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const loyaltyTransactionSchema = new Schema<ILoyaltyTransaction>(
  {
    userId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type:          { type: String, enum: ['earn', 'redeem', 'reverse', 'expire', 'adjust'], required: true },
    points:        { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter:  { type: Number, required: true },
    referenceType: { type: String, enum: ['order', 'redemption', 'admin', 'expiry', 'manual'], required: true },
    referenceId:   { type: Schema.Types.ObjectId },
    description:   { type: String, required: true, trim: true },
    expiresAt:     { type: Date },
    isReversed:    { type: Boolean, default: false },
    reversedTxId:  { type: Schema.Types.ObjectId },
  },
  { timestamps: true }
);

// General lookup index
loyaltyTransactionSchema.index({ userId: 1, type: 1 });

// Idempotency index — prevents duplicate earn/redeem transactions for the same order reference.
// Sparse because only 'earn' and 'redeem' types have referenceId.
loyaltyTransactionSchema.index(
  { referenceType: 1, referenceId: 1, type: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { type: { $in: ['earn', 'redeem'] } },
  }
);

export const LoyaltyTransactionModel = mongoose.model<ILoyaltyTransaction>(
  'LoyaltyTransaction',
  loyaltyTransactionSchema
);
