import mongoose, { Schema, Document } from 'mongoose';

export interface IPrebookingLead extends Document {
  name: string;
  email: string;
  phone: string;
  source: string;
  wantsToDonate: boolean;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PrebookingLeadSchema = new Schema<IPrebookingLead>({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200, unique: true },
  phone: { type: String, required: true, trim: true, maxlength: 24 },
  source: { type: String, default: 'storefront_popup', maxlength: 100 },
  wantsToDonate: { type: Boolean, default: false },
  submittedAt: { type: Date, default: () => new Date() },
}, { timestamps: true });

export const PrebookingLeadModel = mongoose.model<IPrebookingLead>(
  'PrebookingLead', PrebookingLeadSchema, 'prebooking_leads'
);
