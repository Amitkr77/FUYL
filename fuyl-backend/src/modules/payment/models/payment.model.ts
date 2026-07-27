import mongoose, { Schema, Document } from 'mongoose';
import { PaymentMethod, PaymentStatus } from '../../../shared/enums';

export interface IPayment extends Document {
  paymentNumber: string;
  orderId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  method: typeof PaymentMethod[keyof typeof PaymentMethod];
  status: typeof PaymentStatus[keyof typeof PaymentStatus];
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  razorpayRefundId?: string;
  // Cashfree identifiers (current gateway). cfOrderId is our order_id sent to
  // Cashfree; paymentSessionId is handed to the client SDK to render checkout.
  cfOrderId?: string;
  cfPaymentId?: string;
  cfRefundId?: string;
  paymentSessionId?: string;
  gateway: string;                  // 'cashfree' | 'razorpay' | 'wallet' | 'cod'
  gatewayResponse?: Record<string, unknown>;
  failureReason?: string;
  attemptedAt: Date;
  capturedAt?: Date;
  refundedAt?: Date;
  refundedAmount: number;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    paymentNumber: { type: String, required: true, unique: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    method: { type: String, enum: Object.values(PaymentMethod), required: true, index: true },
    status: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.PENDING, index: true },
    razorpayOrderId: { type: String, index: true, sparse: true },
    razorpayPaymentId: { type: String, index: true, sparse: true },
    razorpaySignature: { type: String },
    razorpayRefundId: { type: String, index: true, sparse: true },
    cfOrderId: { type: String, index: true, sparse: true },
    cfPaymentId: { type: String, index: true, sparse: true },
    cfRefundId: { type: String, index: true, sparse: true },
    paymentSessionId: { type: String },
    gateway: { type: String, required: true, default: 'cashfree' },
    gatewayResponse: { type: Schema.Types.Mixed },
    failureReason: { type: String },
    attemptedAt: { type: Date, default: Date.now },
    capturedAt: { type: Date },
    refundedAt: { type: Date },
    refundedAmount: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

PaymentSchema.index({ orderId: 1, status: 1 });

export const PaymentModel = mongoose.model<IPayment>('Payment', PaymentSchema, 'payments');
