import mongoose, { Schema, Document, Types } from 'mongoose';

export type PriceBookType = 'sale' | 'wholesale' | 'subscription' | 'clearance' | 'loyalty';
export type PriceBookStatus = 'draft' | 'active' | 'archived';

export interface IPriceBookEntry {
  productId: Types.ObjectId;
  variantId?: Types.ObjectId;
  price?: number;            // absolute price (if priceType=fixed)
  discountPercent?: number;  // percent off catalog price (if priceType=percent_off)
  currency: string;
}

export interface IPriceBook extends Document {
  name: string;
  type: PriceBookType;
  status: PriceBookStatus;
  description?: string;
  priority: number;                    // higher = applied first
  currency: string;
  startsAt?: Date;
  endsAt?: Date;
  // Apply this price book to specific sellers / categories / customer groups
  sellerIds?: Types.ObjectId[];
  categoryIds?: Types.ObjectId[];
  customerRoles?: string[];            // 'customer' | 'seller' | 'admin' | 'subscriber'
  entries: IPriceBookEntry[];
  // Optional: bundle tier discounts (e.g. "buy 5+ get 10% off")
  volumeTiers?: Array<{
    minQuantity: number;
    discountPercent: number;
    appliesToProductId?: Types.ObjectId;
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PriceBookEntrySchema = new Schema<IPriceBookEntry>({
  productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
  variantId: { type: Schema.Types.ObjectId, ref: 'Variant' },
  price: { type: Number, min: 0 },
  discountPercent: { type: Number, min: 0, max: 100 },
  currency: { type: String, default: 'INR' },
});

const VolumeTierSchema = new Schema({
  minQuantity: { type: Number, min: 1 },
  discountPercent: { type: Number, min: 0, max: 100 },
  appliesToProductId: { type: Schema.Types.ObjectId, ref: 'Product' },
}, { _id: true });

const PriceBookSchema = new Schema<IPriceBook>(
  {
    name: { type: String, required: true, trim: true, index: true },
    type: { type: String, enum: ['sale', 'wholesale', 'subscription', 'clearance', 'loyalty'], default: 'sale', index: true },
    status: { type: String, enum: ['draft', 'active', 'archived'], default: 'draft', index: true },
    description: { type: String, maxlength: 500 },
    priority: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
    startsAt: { type: Date },
    endsAt: { type: Date, index: true },
    sellerIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    customerRoles: [{ type: String }],
    entries: [PriceBookEntrySchema],
    volumeTiers: [VolumeTierSchema],
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

PriceBookSchema.index({ status: 1, isActive: 1, startsAt: 1, endsAt: 1 });
PriceBookSchema.index({ 'entries.productId': 1 });

export const PriceBookModel = mongoose.model<IPriceBook>('PriceBook', PriceBookSchema, 'price_books');
