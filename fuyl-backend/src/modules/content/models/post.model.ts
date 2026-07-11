import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  title: string;
  slug: string;
  excerpt?: string;
  content: string;      // HTML — rendered with dangerouslySetInnerHTML on the storefront
  image?: string;
  category: string;
  tags?: string[];
  author: string;
  status: 'draft' | 'published';
  views: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    excerpt: { type: String, maxlength: 300 },
    content: { type: String, required: true },
    image: { type: String },
    category: { type: String, required: true, trim: true, maxlength: 100 },
    tags: [{ type: String, trim: true, maxlength: 50 }],
    author: { type: String, required: true, trim: true, maxlength: 100 },
    status: { type: String, enum: ['draft', 'published'], default: 'draft', index: true },
    views: { type: Number, default: 0, min: 0 },
    publishedAt: { type: Date },
  },
  { timestamps: true }
);

PostSchema.index({ title: 'text', content: 'text' });

export const PostModel = mongoose.model<IPost>('Post', PostSchema, 'posts');
