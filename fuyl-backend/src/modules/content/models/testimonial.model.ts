import mongoose, { Schema, Document } from 'mongoose';

export interface ITestimonial extends Document {
  name: string;
  title?: string;
  type: 'expert' | 'customer';
  body: string;
  rating?: number;
  image?: string;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TestimonialSchema = new Schema<ITestimonial>(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    title: { type: String, trim: true, maxlength: 150 },
    type: { type: String, enum: ['expert', 'customer'], required: true, index: true },
    body: { type: String, required: true, maxlength: 1000 },
    rating: { type: Number, min: 1, max: 5 },
    image: { type: String, default: '' },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const TestimonialModel = mongoose.model<ITestimonial>('Testimonial', TestimonialSchema, 'testimonials');
