import mongoose, { Schema, Document, Types } from 'mongoose';

export type ReservationStatus = 'active' | 'fulfilled' | 'released' | 'expired';

export interface IStockReservation extends Document {
  productId: Types.ObjectId;
  variantId?: Types.ObjectId;
  sellerId: Types.ObjectId;
  warehouseId?: string;
  cartId?: Types.ObjectId;
  orderId?: Types.ObjectId;
  userId?: Types.ObjectId;
  quantity: number;
  status: ReservationStatus;
  expiresAt: Date;
  releasedAt?: Date;
  fulfilledAt?: Date;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

const StockReservationSchema = new Schema<IStockReservation>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'Variant', index: true, sparse: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    warehouseId: { type: String, default: 'default', index: true },
    cartId: { type: Schema.Types.ObjectId, ref: 'Cart', index: true, sparse: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', index: true, sparse: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
    quantity: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ['active', 'fulfilled', 'released', 'expired'], default: 'active', index: true },
    expiresAt: { type: Date, required: true, index: true },
    releasedAt: { type: Date },
    fulfilledAt: { type: Date },
    note: { type: String, maxlength: 500 },
  },
  { timestamps: true }
);

StockReservationSchema.index({ productId: 1, status: 1, expiresAt: 1 });
StockReservationSchema.index({ cartId: 1, status: 1 });

export const StockReservationModel = mongoose.model<IStockReservation>(
  'StockReservation',
  StockReservationSchema,
  'inventory_reservations'
);
