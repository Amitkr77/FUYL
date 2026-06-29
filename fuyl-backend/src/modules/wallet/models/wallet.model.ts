import mongoose, { Schema, Document } from 'mongoose';

export interface IWallet extends Document {
  userId: mongoose.Types.ObjectId;
  balance: number;             // current available balance (after holds)
  pendingBalance: number;      // credited but not yet available (e.g. pending reward)
  heldBalance: number;         // reserved for in-progress orders
  totalLifetimeCredit: number;
  totalLifetimeDebit: number;
  currency: string;
  loyaltyPoints: number;
  isFrozen: boolean;
  frozenReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WalletSchema = new Schema<IWallet>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    balance: { type: Number, default: 0, min: 0 },
    pendingBalance: { type: Number, default: 0, min: 0 },
    heldBalance: { type: Number, default: 0, min: 0 },
    totalLifetimeCredit: { type: Number, default: 0, min: 0 },
    totalLifetimeDebit: { type: Number, default: 0, min: 0 },
    currency: { type: String, default: 'INR' },
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    isFrozen: { type: Boolean, default: false, index: true },
    frozenReason: { type: String },
  },
  { timestamps: true }
);

export const WalletModel = mongoose.model<IWallet>('Wallet', WalletSchema, 'wallets');
