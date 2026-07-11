import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICartItem {
  productId: Types.ObjectId;
  variantId?: Types.ObjectId;
  name: string;
  sku?: string;
  slug?: string;
  image?: string;
  unitPrice: number;        // snapshot at add-time
  quantity: number;
  currency: string;
  isSubscribable: boolean;
  isTaxable: boolean;        // snapshot from Product.isTaxable at add-time
  addedAt: Date;
  // Subscription context (if user added as subscription)
  subscriptionInterval?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  subscriptionDiscountPercent?: number;
  metadata?: Record<string, unknown>;
}

export interface ICart extends Document {
  userId?: Types.ObjectId;          // null for guest carts
  guestId?: string;                  // for guest carts (cookie-tracked)
  items: ICartItem[];
  currency: string;
  couponCode?: string;
  couponDiscount?: number;
  appliedReferralCode?: string;
  // Snapshot of totals (recomputed on every mutation)
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  shippingTotal: number;
  grandTotal: number;
  itemCount: number;
  // Abandoned-cart tracking
  lastActivityAt: Date;
  abandonedReminderSentAt?: Date;
  isConverted: boolean;              // set true after checkout
  convertedToOrderId?: Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const CartItemSchema = new Schema<ICartItem>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'Variant' },
    name: { type: String, required: true },
    sku: { type: String },
    slug: { type: String },
    image: { type: String },
    unitPrice: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    currency: { type: String, default: 'INR' },
    isSubscribable: { type: Boolean, default: false },
    isTaxable: { type: Boolean, default: true },
    addedAt: { type: Date, default: Date.now },
    subscriptionInterval: { type: String, enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly'] },
    subscriptionDiscountPercent: { type: Number, min: 0, max: 100 },
    metadata: { type: Schema.Types.Mixed },
  },
  { _id: true }
);

const CartSchema = new Schema<ICart>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
    guestId: { type: String, index: true, sparse: true },
    items: [CartItemSchema],
    currency: { type: String, default: 'INR' },
    couponCode: { type: String, index: true, sparse: true },
    couponDiscount: { type: Number, default: 0, min: 0 },
    appliedReferralCode: { type: String, index: true, sparse: true },
    subtotal: { type: Number, default: 0, min: 0 },
    discountTotal: { type: Number, default: 0, min: 0 },
    taxTotal: { type: Number, default: 0, min: 0 },
    shippingTotal: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, default: 0, min: 0 },
    itemCount: { type: Number, default: 0, min: 0 },
    lastActivityAt: { type: Date, default: Date.now, index: true },
    abandonedReminderSentAt: { type: Date },
    isConverted: { type: Boolean, default: false, index: true },
    convertedToOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

CartSchema.index({ userId: 1, isConverted: 1 });
CartSchema.index({ lastActivityAt: 1, isConverted: 1, abandonedReminderSentAt: 1 });

export const CartModel = mongoose.model<ICart>('Cart', CartSchema, 'carts');
