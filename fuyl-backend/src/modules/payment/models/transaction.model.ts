import mongoose, { Schema, Document } from 'mongoose';
import { PaymentMethod, PaymentStatus } from '../../../shared/enums';

export interface ITransaction extends Document {
  transactionNumber: string;
  paymentId: mongoose.Types.ObjectId;
  orderId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  type: 'authorization' | 'capture' | 'refund' | 'chargeback' | 'failure';
  amount: number;
  currency: string;
  method: typeof PaymentMethod[keyof typeof PaymentMethod];
  status: typeof PaymentStatus[keyof typeof PaymentStatus];
  gateway: string;
  gatewayTransactionId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    transactionNumber: { type: String, required: true, unique: true, index: true },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['authorization', 'capture', 'refund', 'chargeback', 'failure'], required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    method: { type: String, enum: Object.values(PaymentMethod) },
    status: { type: String, enum: Object.values(PaymentStatus), required: true },
    gateway: { type: String, required: true },
    gatewayTransactionId: { type: String, index: true, sparse: true },
    description: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

TransactionSchema.index({ orderId: 1, createdAt: -1 });

export const TransactionModel = mongoose.model<ITransaction>('Transaction', TransactionSchema, 'transactions');
