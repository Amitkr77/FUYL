import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICustomerAddress {
  _id?: Types.ObjectId;
  label: string;                    // 'Home', 'Work', etc.
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
  isBilling: boolean;
  isShipping: boolean;
  deliveryInstructions?: string;
}

export interface ICustomerProfile extends Document {
  userId: Types.ObjectId;             // unique — one profile per user
  displayName: string;
  avatarUrl?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'undisclosed';
  // Loyalty
  loyaltyTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  loyaltyPoints: number;
  lifetimeSpend: number;
  lifetimeOrders: number;
  // Communication
  preferredLanguage: string;
  preferredCurrency: string;
  // Addresses
  addresses: ICustomerAddress[];
  // Wishlist (productId + variantId pairs)
  wishlist: Array<{
    productId: Types.ObjectId;
    variantId?: Types.ObjectId;
    addedAt: Date;
  }>;
  // Saved payment methods (tokens only — actual card data is at Razorpay)
  savedPaymentMethods: Array<{
    label: string;
    provider: string;             // 'razorpay'
    token: string;
    isDefault: boolean;
    last4?: string;
    brand?: string;
    expiresAt?: string;
  }>;
  // Subscription-context defaults
  defaultSubscriptionInterval?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  defaultSubscriptionDiscountPercent?: number;
  // Marketing
  referredBy?: string;            // referral code of who invited them
  marketingOptIn: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema<ICustomerAddress>(
  {
    label: { type: String, required: true, trim: true, maxlength: 40 },
    line1: { type: String, required: true, maxlength: 200 },
    line2: { type: String, maxlength: 200 },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
    country: { type: String, required: true, default: 'IN' },
    phone: { type: String, trim: true },
    latitude: { type: Number, min: -90, max: 90 },
    longitude: { type: Number, min: -180, max: 180 },
    isDefault: { type: Boolean, default: false },
    isBilling: { type: Boolean, default: false },
    isShipping: { type: Boolean, default: true },
    deliveryInstructions: { type: String, maxlength: 500 },
  },
  { _id: true, timestamps: false }
);

const WishlistItemSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'Variant' },
    addedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const SavedPaymentSchema = new Schema(
  {
    label: { type: String, required: true, maxlength: 40 },
    provider: { type: String, required: true },
    token: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    last4: { type: String },
    brand: { type: String },
    expiresAt: { type: String },
  },
  { _id: true }
);

const CustomerProfileSchema = new Schema<ICustomerProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    displayName: { type: String, required: true, trim: true },
    avatarUrl: { type: String },
    dateOfBirth: { type: Date },
    gender: { type: String, enum: ['male', 'female', 'other', 'undisclosed'] },
    loyaltyTier: { type: String, enum: ['bronze', 'silver', 'gold', 'platinum'], default: 'bronze', index: true },
    loyaltyPoints: { type: Number, default: 0, min: 0 },
    lifetimeSpend: { type: Number, default: 0, min: 0 },
    lifetimeOrders: { type: Number, default: 0, min: 0 },
    preferredLanguage: { type: String, default: 'en' },
    preferredCurrency: { type: String, default: 'INR' },
    addresses: [AddressSchema],
    wishlist: [WishlistItemSchema],
    savedPaymentMethods: [SavedPaymentSchema],
    defaultSubscriptionInterval: { type: String, enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly'] },
    defaultSubscriptionDiscountPercent: { type: Number, min: 0, max: 100 },
    referredBy: { type: String, index: true, sparse: true },
    marketingOptIn: { type: Boolean, default: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const CustomerProfileModel = mongoose.model<ICustomerProfile>(
  'CustomerProfile',
  CustomerProfileSchema,
  'customer_profiles'
);
