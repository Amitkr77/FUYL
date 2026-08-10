import mongoose, { Schema, Document } from 'mongoose';
import { AttributionMethod } from '../../../shared/enums';

export interface IAffiliateAttribution extends Document {
  affiliateId: mongoose.Types.ObjectId;
  linkId?: mongoose.Types.ObjectId;
  method: typeof AttributionMethod[keyof typeof AttributionMethod];
  // Opaque token stored in the visitor's cookie — used to look up this record at checkout
  token: string;
  // Resolved if the visitor is logged in when they click
  customerId?: mongoose.Types.ObjectId;
  // Filled when the attribution converts to an order
  orderId?: mongoose.Types.ObjectId;
  converted: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AffiliateAttributionSchema = new Schema<IAffiliateAttribution>(
  {
    affiliateId: { type: Schema.Types.ObjectId, ref: 'Affiliate',      required: true, index: true },
    linkId:      { type: Schema.Types.ObjectId, ref: 'AffiliateLink' },
    method:      { type: String, enum: Object.values(AttributionMethod), required: true },
    token:       { type: String, required: true, unique: true, index: true },
    customerId:  { type: Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
    orderId:     { type: Schema.Types.ObjectId, ref: 'Order', index: true, sparse: true },
    converted:   { type: Boolean, default: false },
    expiresAt:   { type: Date, required: true, index: true },
  },
  { timestamps: true }
);

// TTL index — Mongo auto-deletes expired, unconverted attributions
AffiliateAttributionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AffiliateAttributionModel = mongoose.model<IAffiliateAttribution>(
  'AffiliateAttribution',
  AffiliateAttributionSchema,
  'affiliate_attributions'
);
