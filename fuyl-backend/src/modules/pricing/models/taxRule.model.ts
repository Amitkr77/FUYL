import mongoose, { Schema, Document, Types } from 'mongoose';

export type TaxRuleType = 'flat' | 'percent' | 'per_unit';

export interface ITaxRule extends Document {
  name: string;
  code: string;                       // unique short code (e.g. 'GST-18', 'GST-5')
  type: TaxRuleType;
  rate: number;                       // percent (0-100) or flat amount in currency
  currency: string;
  description?: string;
  // Apply to specific categories, sellers, or product kinds
  categoryIds?: Types.ObjectId[];
  hsnCodes?: string[];                // India-specific HSN codes
  sellerIds?: Types.ObjectId[];
  // Region filters (India: state codes)
  states?: string[];                  // empty = applies to all states
  countries?: string[];               // empty = all
  // Compound rule (apply on top of another tax)
  isCompound: boolean;
  // Reverse charge mechanism
  isReverseCharge: boolean;
  isActive: boolean;
  startsAt?: Date;
  endsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaxRuleSchema = new Schema<ITaxRule>(
  {
    name: { type: String, required: true, trim: true, index: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    type: { type: String, enum: ['flat', 'percent', 'per_unit'], default: 'percent' },
    rate: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'INR' },
    description: { type: String, maxlength: 500 },
    categoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    hsnCodes: [{ type: String, trim: true, uppercase: true }],
    sellerIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    states: [{ type: String, trim: true, uppercase: true }],
    countries: [{ type: String, trim: true, uppercase: true }],
    isCompound: { type: Boolean, default: false },
    isReverseCharge: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    startsAt: { type: Date },
    endsAt: { type: Date },
  },
  { timestamps: true }
);

export const TaxRuleModel = mongoose.model<ITaxRule>('TaxRule', TaxRuleSchema, 'tax_rules');
