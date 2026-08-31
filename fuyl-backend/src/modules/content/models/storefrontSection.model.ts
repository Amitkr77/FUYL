import mongoose, { Schema, Document } from 'mongoose';

export interface IStorefrontSectionRevision {
  revisionId: string;
  title: string;
  isActive: boolean;
  data: Record<string, unknown>;
  savedAt: Date;
}

export interface IStorefrontSection extends Document {
  key: string;
  title: string;
  isActive: boolean;
  data: Record<string, unknown>;
  revisions?: IStorefrontSectionRevision[];
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IStorefrontSection>({
  key: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  data: { type: Schema.Types.Mixed, default: {} },
  revisions: {
    type: [{
      _id: false,
      revisionId: { type: String, required: true },
      title: { type: String, required: true },
      isActive: { type: Boolean, required: true },
      data: { type: Schema.Types.Mixed, required: true },
      savedAt: { type: Date, required: true },
    }],
    default: [],
    select: false,
  },
}, { timestamps: true });

export const StorefrontSectionModel = mongoose.model<IStorefrontSection>('StorefrontSection', schema, 'storefront_sections');
