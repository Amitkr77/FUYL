import mongoose, { Schema, Document } from 'mongoose';
import { IProductMedia } from './product.model';

export interface IVariant extends Document {
  productId: mongoose.Types.ObjectId;
  sku: string;                       // unique
  name: string;                      // e.g. "500g - Spicy"
  attributes: Map<string, string | number | boolean>;  // e.g. { size: '500g', flavor: 'spicy' }
  price: number;
  salePrice?: number;
  compareAtPrice?: number;
  currency: string;
  media?: IProductMedia[];
  weight?: number;                   // grams
  weightUnit?: string;
  barcode?: string;
  isActive: boolean;
  isSubscribable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VariantSchema = new Schema<IVariant>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    name: { type: String, required: true, trim: true },
    attributes: { type: Map, of: Schema.Types.Mixed, default: {} },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    currency: { type: String, default: 'INR' },
    media: [{
      url: { type: String, required: true },
      type: { type: String, enum: ['image', 'video', 'pdf'], default: 'image' },
      alt: { type: String },
      position: { type: Number, default: 0 },
      isPrimary: { type: Boolean, default: false },
      cloudinaryPublicId: { type: String },
    }],
    weight: { type: Number, min: 0 },
    weightUnit: { type: String, default: 'g' },
    barcode: { type: String, index: true, sparse: true },
    isActive: { type: Boolean, default: true, index: true },
    isSubscribable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

VariantSchema.index({ productId: 1, isActive: 1 });

export const VariantModel = mongoose.model<IVariant>('Variant', VariantSchema, 'variants');
