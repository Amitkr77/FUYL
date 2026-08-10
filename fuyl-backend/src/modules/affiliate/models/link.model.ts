import mongoose, { Schema, Document } from 'mongoose';

export interface IAffiliateLink extends Document {
  affiliateId: mongoose.Types.ObjectId;
  // Short code embedded in ?ref=<code> or /r/<code>
  code: string;
  // Where to redirect after recording the click (defaults to storefront root)
  destination: string;
  isActive: boolean;
  label?: string; // friendly name e.g. "Instagram Bio"
  createdAt: Date;
  updatedAt: Date;
}

const AffiliateLinkSchema = new Schema<IAffiliateLink>(
  {
    affiliateId: { type: Schema.Types.ObjectId, ref: 'Affiliate', required: true, index: true },
    code:        { type: String, required: true, unique: true, index: true, uppercase: true, trim: true },
    destination: { type: String, required: true, default: '/' },
    isActive:    { type: Boolean, default: true, index: true },
    label:       { type: String, trim: true },
  },
  { timestamps: true }
);

export const AffiliateLinkModel = mongoose.model<IAffiliateLink>(
  'AffiliateLink',
  AffiliateLinkSchema,
  'affiliate_links'
);
