import mongoose, { Schema, Document } from 'mongoose';

export interface IPaymentSettings {
  onlinePaymentEnabled: boolean;   // Razorpay / online gateway
  codEnabled: boolean;             // Cash on delivery
  codMinOrderAmount?: number;      // minimum order value to allow COD
  codMaxOrderAmount?: number;      // maximum order value to allow COD
}

export interface ISiteSettings extends Document {
  // singleton — always fetch with findOne({})
  payment: IPaymentSettings;
  updatedAt: Date;
  createdAt: Date;
}

const SiteSettingsSchema = new Schema<ISiteSettings>(
  {
    payment: {
      onlinePaymentEnabled: { type: Boolean, default: true },
      codEnabled:           { type: Boolean, default: true },
      codMinOrderAmount:    { type: Number, min: 0 },
      codMaxOrderAmount:    { type: Number, min: 0 },
    },
  },
  { timestamps: true }
);

export const SiteSettingsModel = mongoose.model<ISiteSettings>(
  'SiteSettings',
  SiteSettingsSchema,
  'site_settings'
);
