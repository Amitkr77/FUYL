import mongoose, { Schema, Document } from 'mongoose';
import { SubscriptionStatus, OrderStatus } from '../../../shared/enums';

export interface ISubscriptionDelivery extends Document {
  subscriptionId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  cycleNumber: number;
  scheduledFor: Date;
  executedAt?: Date;
  orderId?: mongoose.Types.ObjectId;
  orderStatus?: typeof OrderStatus[keyof typeof OrderStatus];
  invoiceId?: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  status: 'scheduled' | 'processing' | 'success' | 'failed' | 'skipped' | 'cancelled';
  failureReason?: string;
  razorpayPaymentId?: string;
  razorpayInvoiceId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionDeliverySchema = new Schema<ISubscriptionDelivery>(
  {
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    cycleNumber: { type: Number, required: true },
    scheduledFor: { type: Date, required: true, index: true },
    executedAt: { type: Date },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    orderStatus: { type: String, enum: Object.values(OrderStatus) },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice' },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    status: {
      type: String,
      enum: ['scheduled', 'processing', 'success', 'failed', 'skipped', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    failureReason: { type: String },
    razorpayPaymentId: { type: String },
    razorpayInvoiceId: { type: String },
  },
  { timestamps: true }
);

SubscriptionDeliverySchema.index({ subscriptionId: 1, cycleNumber: 1 }, { unique: true });
SubscriptionDeliverySchema.index({ status: 1, scheduledFor: 1 });

export const SubscriptionDeliveryModel = mongoose.model<ISubscriptionDelivery>(
  'SubscriptionDelivery',
  SubscriptionDeliverySchema,
  'subscription_deliveries'
);
