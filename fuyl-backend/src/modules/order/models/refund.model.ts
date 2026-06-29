import mongoose, { Schema, Document } from 'mongoose';

export interface IRefund extends Document {
  refundNumber: string;
  orderId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  returnId?: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  method: 'wallet' | 'original' | 'split';
  status: 'pending' | 'processed' | 'failed' | 'reversed';
  razorpayRefundId?: string;
  walletTransactionId?: mongoose.Types.ObjectId;
  processedAt?: Date;
  processedBy?: mongoose.Types.ObjectId;
  reason: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const RefundSchema = new Schema<IRefund>(
  {
    refundNumber: { type: String, required: true, unique: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    returnId: { type: Schema.Types.ObjectId, ref: 'Return' },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    method: { type: String, enum: ['wallet', 'original', 'split'], default: 'wallet' },
    status: { type: String, enum: ['pending', 'processed', 'failed', 'reversed'], default: 'pending', index: true },
    razorpayRefundId: { type: String, index: true, sparse: true },
    walletTransactionId: { type: Schema.Types.ObjectId, ref: 'WalletTransaction' },
    processedAt: { type: Date },
    processedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reason: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const RefundModel = mongoose.model<IRefund>('Refund', RefundSchema, 'refunds');
