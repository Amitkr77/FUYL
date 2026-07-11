import mongoose, { Schema, Document } from 'mongoose';
import { SubscriptionStatus, SubscriptionInterval, PaymentMethod } from '../../../shared/enums';

export interface ISubscription extends Document {
  customerId: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  variantId?: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  status: typeof SubscriptionStatus[keyof typeof SubscriptionStatus];
  interval: typeof SubscriptionInterval[keyof typeof SubscriptionInterval];
  intervalCount: number;
  quantity: number;
  basePrice: number;             // price locked at subscription creation
  discountPercent: number;
  finalPrice: number;            // basePrice * (1 - discount%)
  currency: string;
  paymentMethod: typeof PaymentMethod[keyof typeof PaymentMethod];
  razorpaySubscriptionId?: string;
  razorpayCustomerId?: string;
  razorpayPaymentMethodId?: string;
  nextDeliveryDate: Date;
  currentCycleStart: Date;
  currentCycleEnd: Date;
  totalCyclesExecuted: number;
  totalCyclesFailed: number;
  consecutiveFailures: number;
  skipCount: number;
  freeShipping: boolean;
  priceLock: boolean;
  addressSnapshotId?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
  cancelledReason?: string;
  cancelledBy?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'Variant' },
    planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    status: { type: String, enum: Object.values(SubscriptionStatus), default: SubscriptionStatus.PENDING, index: true },
    interval: { type: String, enum: Object.values(SubscriptionInterval), required: true },
    intervalCount: { type: Number, default: 1, min: 1 },
    quantity: { type: Number, default: 1, min: 1 },
    basePrice: { type: Number, required: true },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    finalPrice: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    paymentMethod: { type: String, enum: Object.values(PaymentMethod), default: PaymentMethod.RAZORPAY },
    razorpaySubscriptionId: { type: String, index: true, sparse: true },
    razorpayCustomerId: { type: String },
    razorpayPaymentMethodId: { type: String },
    nextDeliveryDate: { type: Date, index: true },
    currentCycleStart: { type: Date },
    currentCycleEnd: { type: Date },
    totalCyclesExecuted: { type: Number, default: 0 },
    totalCyclesFailed: { type: Number, default: 0 },
    consecutiveFailures: { type: Number, default: 0 },
    skipCount: { type: Number, default: 0 },
    freeShipping: { type: Boolean, default: false },
    priceLock: { type: Boolean, default: false },
    addressSnapshotId: { type: Schema.Types.ObjectId },
    cancelledAt: { type: Date },
    cancelledReason: { type: String },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

SubscriptionSchema.index({ customerId: 1, status: 1 });
SubscriptionSchema.index({ nextDeliveryDate: 1, status: 1 });
SubscriptionSchema.index({ status: 1, nextDeliveryDate: 1 });

export const SubscriptionModel = mongoose.model<ISubscription>(
  'Subscription',
  SubscriptionSchema,
  'subscriptions'
);
