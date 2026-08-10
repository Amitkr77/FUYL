import mongoose, { Schema, Document } from 'mongoose';

export interface IAffiliateClick extends Document {
  affiliateId: mongoose.Types.ObjectId;
  linkId: mongoose.Types.ObjectId;
  // Hashed so we can deduplicate without storing raw PII
  ipHash: string;
  userAgent?: string;
  landingPage: string;
  // Did this click result in a conversion? Set when commission is created.
  converted: boolean;
  orderId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AffiliateClickSchema = new Schema<IAffiliateClick>(
  {
    affiliateId: { type: Schema.Types.ObjectId, ref: 'Affiliate',      required: true, index: true },
    linkId:      { type: Schema.Types.ObjectId, ref: 'AffiliateLink',  required: true },
    ipHash:      { type: String, required: true },
    userAgent:   { type: String },
    landingPage: { type: String, required: true },
    converted:   { type: Boolean, default: false, index: true },
    orderId:     { type: Schema.Types.ObjectId, ref: 'Order', index: true, sparse: true },
  },
  { timestamps: true }
);

AffiliateClickSchema.index({ affiliateId: 1, createdAt: -1 });

export const AffiliateClickModel = mongoose.model<IAffiliateClick>(
  'AffiliateClick',
  AffiliateClickSchema,
  'affiliate_clicks'
);
