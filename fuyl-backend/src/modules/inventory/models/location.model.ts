import mongoose, { Schema, Document } from 'mongoose';

export interface IWarehouseLocation extends Document {
  name: string;
  code: string;       // short identifier used as warehouseId in stock rows
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  isActive: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WarehouseLocationSchema = new Schema<IWarehouseLocation>(
  {
    name:    { type: String, required: true, trim: true },
    code:    { type: String, required: true, trim: true, unique: true, uppercase: true },
    address: {
      line1:      { type: String, trim: true },
      line2:      { type: String, trim: true },
      city:       { type: String, trim: true },
      state:      { type: String, trim: true },
      postalCode: { type: String, trim: true },
      country:    { type: String, trim: true, default: 'IN' },
    },
    isActive:  { type: Boolean, default: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const WarehouseLocationModel = mongoose.model<IWarehouseLocation>(
  'WarehouseLocation',
  WarehouseLocationSchema,
  'warehouse_locations'
);
