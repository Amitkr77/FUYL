import mongoose, { Schema, Document } from 'mongoose';
import { OrderStatus } from '../../../shared/enums';

export interface IReturn extends Document {
  returnNumber: string;
  orderId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  items: Array<{
    productId: mongoose.Types.ObjectId;
    variantId?: mongoose.Types.ObjectId;
    quantity: number;
    reason: string;
    reasonDetails?: string;
    images?: string[];
    condition: 'unopened' | 'opened' | 'damaged';
  }>;
  status: 'requested' | 'approved' | 'rejected' | 'pickup_scheduled' | 'picked_up' | 'received' | 'refunded' | 'cancelled';
  refundAmount: number;
  refundMethod: 'wallet' | 'original' | 'split';
  requestedAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectedReason?: string;
  pickupScheduledAt?: Date;
  pickedUpAt?: Date;
  receivedAt?: Date;
  refundedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ReturnSchema = new Schema<IReturn>(
  {
    returnNumber: { type: String, required: true, unique: true, index: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [{
      productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
      variantId: { type: Schema.Types.ObjectId, ref: 'Variant' },
      quantity: { type: Number, required: true, min: 1 },
      reason: { type: String, required: true },
      reasonDetails: { type: String },
      images: [{ type: String }],
      condition: { type: String, enum: ['unopened', 'opened', 'damaged'], default: 'unopened' },
    }],
    status: {
      type: String,
      enum: ['requested', 'approved', 'rejected', 'pickup_scheduled', 'picked_up', 'received', 'refunded', 'cancelled'],
      default: 'requested',
      index: true,
    },
    refundAmount: { type: Number, default: 0, min: 0 },
    refundMethod: { type: String, enum: ['wallet', 'original', 'split'], default: 'wallet' },
    requestedAt: { type: Date, default: Date.now },
    approvedAt: { type: Date },
    rejectedAt: { type: Date },
    rejectedReason: { type: String },
    pickupScheduledAt: { type: Date },
    pickedUpAt: { type: Date },
    receivedAt: { type: Date },
    refundedAt: { type: Date },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

export const ReturnModel = mongoose.model<IReturn>('Return', ReturnSchema, 'returns');
