import mongoose, { Schema, Document } from 'mongoose';
import { OrderStatus, PaymentMethod, PaymentStatus } from '../../../shared/enums';

export interface IOrderItem {
  productId: mongoose.Types.ObjectId;
  variantId?: mongoose.Types.ObjectId;
  name: string;                  // snapshot at purchase time
  sku: string;
  quantity: number;
  unitPrice: number;             // price per unit
  totalPrice: number;            // unitPrice * quantity
  discount: number;
  tax: number;
  currency: string;
  image?: string;
  subscriptionId?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
}

export interface IOrderAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  type: 'home' | 'office' | 'other';
}

export interface IOrderTimelineEvent {
  status: typeof OrderStatus[keyof typeof OrderStatus];
  at: Date;
  note?: string;
  actor?: mongoose.Types.ObjectId;
}

export interface IOrder extends Document {
  orderNumber: string;           // human-readable e.g. FUL-2024-00001
  customerId: mongoose.Types.ObjectId;
  sellerIds: mongoose.Types.ObjectId[];
  items: IOrderItem[];
  status: typeof OrderStatus[keyof typeof OrderStatus];
  currency: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  paymentStatus: typeof PaymentStatus[keyof typeof PaymentStatus];
  paymentMethod: typeof PaymentMethod[keyof typeof PaymentMethod];
  paymentId?: mongoose.Types.ObjectId;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  shippingAddress: IOrderAddress;
  billingAddress: IOrderAddress;
  isSubscriptionOrder: boolean;
  subscriptionId?: mongoose.Types.ObjectId;
  deliveryCycleNumber?: number;
  notes?: string;
  adminNotes?: string;
  internalNotes?: string;
  timeline: IOrderTimelineEvent[];
  placedAt: Date;
  confirmedAt?: Date;
  packedAt?: Date;
  shippedAt?: Date;
  deliveredAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancelledReason?: string;
  cancelledBy?: mongoose.Types.ObjectId;
  trackingNumber?: string;
  trackingUrl?: string;
  carrier?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: { type: Schema.Types.ObjectId, ref: 'Variant' },
  name: { type: String, required: true },
  sku: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  totalPrice: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0 },
  tax: { type: Number, default: 0, min: 0 },
  currency: { type: String, default: 'INR' },
  image: { type: String },
  subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription' },
  metadata: { type: Schema.Types.Mixed },
}, { _id: false });

const OrderAddressSchema = new Schema<IOrderAddress>({
  fullName: { type: String, required: true },
  phone: { type: String, required: true },
  line1: { type: String, required: true },
  line2: { type: String },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  country: { type: String, required: true },
  type: { type: String, enum: ['home', 'office', 'other'], default: 'home' },
}, { _id: false });

const TimelineSchema = new Schema<IOrderTimelineEvent>({
  status: { type: String, enum: Object.values(OrderStatus), required: true },
  at: { type: Date, default: Date.now },
  note: { type: String },
  actor: { type: Schema.Types.ObjectId, ref: 'User' },
}, { _id: false });

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sellerIds: [{ type: Schema.Types.ObjectId, ref: 'User', index: true }],
    items: [OrderItemSchema],
    status: { type: String, enum: Object.values(OrderStatus), default: OrderStatus.PENDING, index: true },
    currency: { type: String, default: 'INR' },
    subtotal: { type: Number, default: 0, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    taxTotal: { type: Number, default: 0, min: 0 },
    shippingTotal: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, default: 0, min: 0 },
    paymentStatus: { type: String, enum: Object.values(PaymentStatus), default: PaymentStatus.PENDING, index: true },
    paymentMethod: { type: String, enum: Object.values(PaymentMethod), default: PaymentMethod.RAZORPAY },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment' },
    razorpayOrderId: { type: String, index: true, sparse: true },
    razorpayPaymentId: { type: String, index: true, sparse: true },
    razorpaySignature: { type: String },
    shippingAddress: { type: OrderAddressSchema, required: true },
    billingAddress: { type: OrderAddressSchema, required: true },
    isSubscriptionOrder: { type: Boolean, default: false, index: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', index: true },
    deliveryCycleNumber: { type: Number },
    notes: { type: String },
    adminNotes: { type: String },
    internalNotes: { type: String },
    timeline: [TimelineSchema],
    placedAt: { type: Date, default: Date.now },
    confirmedAt: { type: Date },
    packedAt: { type: Date },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    cancelledReason: { type: String },
    cancelledBy: { type: Schema.Types.ObjectId, ref: 'User' },
    trackingNumber: { type: String, index: true, sparse: true },
    trackingUrl: { type: String },
    carrier: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

OrderSchema.index({ customerId: 1, status: 1, createdAt: -1 });
OrderSchema.index({ sellerIds: 1, status: 1 });
OrderSchema.index({ subscriptionId: 1, deliveryCycleNumber: 1 }, { sparse: true, unique: true });

export const OrderModel = mongoose.model<IOrder>('Order', OrderSchema, 'orders');
