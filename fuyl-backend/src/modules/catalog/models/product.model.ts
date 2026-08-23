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

// Repeatable rich-content block (image + optional title + description) shown
// in the admin "Product Details" section — lets admins add freeform
// informational content beyond the fixed benefits/FAQs/certifications lists.
export interface IProductInfoBlock {
  image?: string;
  title?: string;
  description: string;
}

// Shipping/customs attributes live on the PRODUCT (not just Variant) because
// variants are optional — a product with zero variants still needs a weight
// for logistics (see checkout.service.ts computeCartWeight's fallback).
export type ShippingMode = 'calculated' | 'fixed' | 'free';

export interface IProductShippingInfo {
  isPhysical: boolean;
  packageType?: string;
  weight?: number;
  weightUnit: 'g' | 'kg' | 'lb' | 'oz';
  // Dimensions in centimetres — used to compute volumetric weight
  // (L × W × H / 5000) for carriers that bill by whichever is higher.
  length?: number;
  width?: number;
  height?: number;
  countryOfOrigin?: string;
  hsCode?: string;           // Harmonized System code, for customs declarations
  shippingMode?: ShippingMode; // calculated (default) | fixed | free
  fixedShippingRate?: number;  // used when shippingMode === 'fixed' (in rupees)
}

export interface IProduct extends Document {
  name: string;
  shortDescription?: string;
  description?: string;
  brand?: string;
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
  taxRate?: number;              // GST % applied when isTaxable is true (e.g. 18 = 18%)
  costPerItem?: number;          // admin-only — never serialize on public routes
  currency: string;
  isSubscribable: boolean;
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
  infoBlocks?: IProductInfoBlock[];
  shippingInfo?: IProductShippingInfo;
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
    taxRate: { type: Number, min: 0, max: 100 },
    costPerItem: { type: Number, min: 0 },
    currency: { type: String, default: 'INR' },
    isSubscribable: { type: Boolean, default: false, index: true },
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
    infoBlocks: [{
      image: { type: String },
      title: { type: String, trim: true, maxlength: 150 },
      description: { type: String, required: true, maxlength: 2000 },
    }],
    shippingInfo: {
      isPhysical: { type: Boolean, default: true },
      packageType: { type: String, trim: true, maxlength: 60 },
      weight: { type: Number, min: 0 },
      weightUnit: { type: String, enum: ['g', 'kg', 'lb', 'oz'], default: 'g' },
      length: { type: Number, min: 0 },
      width:  { type: Number, min: 0 },
      height: { type: Number, min: 0 },
      countryOfOrigin: { type: String, trim: true, maxlength: 100 },
      hsCode: { type: String, trim: true, maxlength: 30 },
      shippingMode: { type: String, enum: ['calculated', 'fixed', 'free'], default: 'calculated' },
      fixedShippingRate: { type: Number, min: 0 },
    },
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
ProductSchema.index({ isPublished: 1, isFeatured: 1, createdAt: -1 });

export const ProductModel = mongoose.model<IProduct>('Product', ProductSchema, 'products');
