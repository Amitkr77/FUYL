import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ILoyaltyAccount extends Document {
  userId: Types.ObjectId;
  /** Current available points (never negative). */
  balance: number;
  /** Total points ever earned (lifetime). */
  lifetimeEarned: number;
  /** Total points ever redeemed (lifetime). */
  lifetimeRedeemed: number;
  createdAt: Date;
  updatedAt: Date;
}

const loyaltyAccountSchema = new Schema<ILoyaltyAccount>(
  {
    userId:           { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    balance:          { type: Number, default: 0, min: 0 },
    lifetimeEarned:   { type: Number, default: 0, min: 0 },
    lifetimeRedeemed: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const LoyaltyAccountModel = mongoose.model<ILoyaltyAccount>('LoyaltyAccount', loyaltyAccountSchema);
