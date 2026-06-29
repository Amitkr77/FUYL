import mongoose, { Schema, Document } from 'mongoose';

export interface IAttribute extends Document {
  name: string;             // e.g. "Color"
  slug: string;             // e.g. "color"
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date';
  options?: string[];       // for select/multiselect
  unit?: string;            // e.g. "grams", "ml"
  isFilterable: boolean;
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AttributeSchema = new Schema<IAttribute>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    type: { type: String, enum: ['text', 'number', 'boolean', 'select', 'multiselect', 'date'], required: true },
    options: [{ type: String }],
    unit: { type: String },
    isFilterable: { type: Boolean, default: true, index: true },
    isRequired: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const AttributeModel = mongoose.model<IAttribute>('Attribute', AttributeSchema, 'attributes');
