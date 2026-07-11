import mongoose, { Schema, Document } from 'mongoose';
import { ShipmentStatus } from '../../../shared/enums';

export interface IShipmentAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface IShipmentEvent {
  status: typeof ShipmentStatus[keyof typeof ShipmentStatus];
  at: Date;
  note?: string;
  location?: string;
}

export interface IShipment extends Document {
  shipmentNumber: string;
  orderId: mongoose.Types.ObjectId;
  sellerId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  status: typeof ShipmentStatus[keyof typeof ShipmentStatus];
  carrier: string;
  trackingNumber: string;
  trackingUrl?: string;
  labelUrl?: string;
  shippingAddress: IShipmentAddress;
  weightGrams?: number;
  dimensionsCm?: { length: number; width: number; height: number };
  cost?: number;
  currency: string;
  estimatedDeliveryDate?: Date;
  deliveredAt?: Date;
  timeline: IShipmentEvent[];
  createdAt: Date;
  updatedAt: Date;
}

const ShipmentAddressSchema = new Schema<IShipmentAddress>(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
    country: { type: String, required: true, default: 'IN' },
  },
  { _id: false }
);

const ShipmentEventSchema = new Schema<IShipmentEvent>(
  {
    status: { type: String, enum: Object.values(ShipmentStatus), required: true },
    at: { type: Date, required: true, default: Date.now },
    note: { type: String },
    location: { type: String },
  },
  { _id: false }
);

const ShipmentSchema = new Schema<IShipment>(
  {
    shipmentNumber: { type: String, required: true, unique: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: Object.values(ShipmentStatus), default: ShipmentStatus.PENDING, index: true },
    carrier: { type: String, required: true },
    trackingNumber: { type: String, required: true, index: true },
    trackingUrl: { type: String },
    labelUrl: { type: String },
    shippingAddress: { type: ShipmentAddressSchema, required: true },
    weightGrams: { type: Number },
    dimensionsCm: {
      length: { type: Number },
      width: { type: Number },
      height: { type: Number },
    },
    cost: { type: Number },
    currency: { type: String, default: 'INR' },
    estimatedDeliveryDate: { type: Date },
    deliveredAt: { type: Date },
    timeline: { type: [ShipmentEventSchema], default: [] },
  },
  { timestamps: true }
);

ShipmentSchema.index({ sellerId: 1, status: 1, createdAt: -1 });

export const ShipmentModel = mongoose.model<IShipment>('Shipment', ShipmentSchema, 'shipments');
