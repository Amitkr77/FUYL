import mongoose, { Schema, Document } from 'mongoose';

export interface ICMSPage extends Document {
  title: string;
  slug: string;
  body: string;
  seoTitle?: string;
  seoDescription?: string;
  status: 'draft' | 'published';
  navigationPlacement: 'none' | 'header' | 'footer' | 'both';
  navigationLabel?: string;
  navigationOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const CMSPageSchema = new Schema<ICMSPage>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    body: { type: String, required: true },
    seoTitle: { type: String, maxlength: 200 },
    seoDescription: { type: String, maxlength: 300 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    navigationPlacement: { type: String, enum: ['none', 'header', 'footer', 'both'], default: 'none', index: true },
    navigationLabel: { type: String, trim: true, maxlength: 80 },
    navigationOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);
CMSPageSchema.index({ status: 1, navigationPlacement: 1, navigationOrder: 1 });

export const CMSPageModel = mongoose.model<ICMSPage>('CMSPage', CMSPageSchema, 'cms_pages');
