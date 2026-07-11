import mongoose, { Schema, Document } from 'mongoose';

export interface ICMSPage extends Document {
  title: string;
  slug: string;
  body: string;
  seoTitle?: string;
  seoDescription?: string;
  status: 'draft' | 'published';
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
  },
  { timestamps: true }
);

export const CMSPageModel = mongoose.model<ICMSPage>('CMSPage', CMSPageSchema, 'cms_pages');
