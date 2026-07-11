import mongoose, { Schema, Document } from 'mongoose';
import { ProductStatus } from '../../../shared/enums';

export interface IProductMedia {
  url: string;
  type: 'image' | 'video' | 'pdf';
  alt?: string;
  position: number;
  isPrimary: boolean;
  cloudinaryPublicId?: string;
}

export interface IProductSEO {
  metaTitle?: string;
  metaDescription?: string;
  slug: string;              // unique URL slug
  canonicalUrl?: string;
  keywords?: string[];
}

export interface INutritionalFact {
  servingSize?: string;
  calories?: number;
  protein?: number;          // grams
  carbs?: number;            // grams
  fat?: number;              // grams
  fiber?: number;            // grams
  sugar?: number;            // grams
  sodium?: number;           // mg
  additional?: Array<{ label: string; value: string; unit?: string }>;
}

export interface IProduct extends Document {
  name: string;
  shortDescription?: string;
  description?: string;
  brand?: string;
  sellerId: mongoose.Types.ObjectId;
  categoryIds: mongoose.Types.ObjectId[];
  collectionIds?: mongoose.Types.ObjectId[];
  tagIds?: mongoose.Types.ObjectId[];
  attributeValues: Map<string, string | number | boolean | string[]>;
  media: IProductMedia[];
  seo: IProductSEO;
  basePrice: number;
  salePrice?: number;
  compareAtPrice?: number;
  additionalPrices?: { label: string; price: number }[];
  unitPrice?: { value: number; unit: string };
  isTaxable: boolean;
  costPerItem?: number;          // admin-only — never serialize on public routes
  currency: string;
  isSubscribable: boolean;
  isBundle: boolean;
  bundleProductIds?: mongoose.Types.ObjectId[];
  ingredients?: string[];
  benefits?: string[];
  faqs?: { question: string; answer: string }[];
  supplementInfo?: {
    ageGroup?: string;
    dietaryUse?: string;
    flavor?: string;
    ingredientCategory?: string;
    routeOfAdministration?: string;
    healthFocus?: string[];
  };
  nutritionalFacts?: INutritionalFact;
  certifications?: { label: string; logoUrl: string }[];
  // Admin-facing lifecycle state. isPublished/isDeleted below remain the
  // fields actually queried/indexed (unchanged); the repository keeps them
  // in sync with `status` on every write so existing queries keep working.
  status: typeof ProductStatus[keyof typeof ProductStatus];
  isPublished: boolean;
  publishedAt?: Date;
  isFeatured: boolean;
  isDeleted: boolean;
  ratingAverage: number;
  ratingCount: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true, index: 'text' },
    shortDescription: { type: String, maxlength: 280 },
    description: { type: String },
    brand: { type: String, trim: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category', index: true }],
    collectionIds: [{ type: Schema.Types.ObjectId, ref: 'Collection' }],
    tagIds: [{ type: Schema.Types.ObjectId, ref: 'Tag' }],
    attributeValues: { type: Map, of: Schema.Types.Mixed, default: {} },
    media: [{
      url: { type: String, required: true },
      type: { type: String, enum: ['image', 'video', 'pdf'], default: 'image' },
      alt: { type: String },
      position: { type: Number, default: 0 },
      isPrimary: { type: Boolean, default: false },
      cloudinaryPublicId: { type: String },
    }],
    seo: {
      metaTitle: { type: String },
      metaDescription: { type: String },
      slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
      canonicalUrl: { type: String },
      keywords: [{ type: String }],
    },
    basePrice: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    additionalPrices: [{
      label: { type: String, required: true, trim: true, maxlength: 60 },
      price: { type: Number, required: true, min: 0 },
    }],
    unitPrice: {
      value: { type: Number, min: 0 },
      unit: { type: String, trim: true, maxlength: 40 },
    },
    isTaxable: { type: Boolean, default: true },
    costPerItem: { type: Number, min: 0 },
    currency: { type: String, default: 'INR' },
    isSubscribable: { type: Boolean, default: false, index: true },
    isBundle: { type: Boolean, default: false },
    bundleProductIds: [{ type: Schema.Types.ObjectId, ref: 'Product' }],
    ingredients: [{ type: String }],
    benefits: [{ type: String }],
    faqs: [{
      question: { type: String, required: true, trim: true, maxlength: 300 },
      answer: { type: String, required: true, maxlength: 2000 },
    }],
    supplementInfo: {
      ageGroup: { type: String, trim: true },
      dietaryUse: { type: String, trim: true },
      flavor: { type: String, trim: true },
      ingredientCategory: { type: String, trim: true },
      routeOfAdministration: { type: String, trim: true },
      healthFocus: [{ type: String }],
    },
    nutritionalFacts: {
      servingSize: { type: String },
      calories: { type: Number },
      protein: { type: Number },
      carbs: { type: Number },
      fat: { type: Number },
      fiber: { type: Number },
      sugar: { type: Number },
      sodium: { type: Number },
      additional: [{
        label: { type: String },
        value: { type: String },
        unit: { type: String },
      }],
    },
    certifications: [{
      label: { type: String, required: true, trim: true, maxlength: 100 },
      logoUrl: { type: String, required: true },
    }],
    status: {
      type: String,
      enum: Object.values(ProductStatus),
      default: ProductStatus.DRAFT,
      index: true,
    },
    isPublished: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date },
    isFeatured: { type: Boolean, default: false, index: true },
    isDeleted: { type: Boolean, default: false },
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

ProductSchema.index({ name: 'text', shortDescription: 'text', brand: 'text' });
ProductSchema.index({ categoryIds: 1, isPublished: 1 });
ProductSchema.index({ sellerId: 1, isPublished: 1 });
ProductSchema.index({ isPublished: 1, isFeatured: 1, createdAt: -1 });

export const ProductModel = mongoose.model<IProduct>('Product', ProductSchema, 'products');
