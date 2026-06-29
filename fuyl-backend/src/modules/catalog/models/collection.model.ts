import mongoose, { Schema, Document } from 'mongoose';

export interface ICollection extends Document {
  name: string;             // e.g. "Summer Sale"
  slug: string;
  description?: string;
  imageUrl?: string;
  rules: Array<{
    field: string;          // 'category' | 'tag' | 'price' | 'attribute'
    operator: 'eq' | 'ne' | 'in' | 'lt' | 'gt' | 'lte' | 'gte';
    value: string | number | string[];
  }>;
  matchType: 'all' | 'any';  // AND or OR across rules
  isActive: boolean;
  startsAt?: Date;
  endsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CollectionSchema = new Schema<ICollection>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String },
    imageUrl: { type: String },
    rules: [{
      field: { type: String, required: true },
      operator: { type: String, enum: ['eq', 'ne', 'in', 'lt', 'gt', 'lte', 'gte'], required: true },
      value: { type: Schema.Types.Mixed },
    }],
    matchType: { type: String, enum: ['all', 'any'], default: 'all' },
    isActive: { type: Boolean, default: true, index: true },
    startsAt: { type: Date },
    endsAt: { type: Date },
  },
  { timestamps: true }
);

export const CollectionModel = mongoose.model<ICollection>('Collection', CollectionSchema, 'collections');
