import mongoose, { Schema, Document, Types } from 'mongoose';

export type MovementType =
  | 'purchase'           // incoming stock from supplier
  | 'return_in'          // customer return
  | 'adjustment_in'      // manual adjustment +
  | 'transfer_in'        // received from another warehouse
  | 'order_out'          // sold (shipped)
  | 'return_out'         // return sent back
  | 'adjustment_out'     // manual adjustment -
  | 'transfer_out'       // sent to another warehouse
  | 'damage'             // damaged / written off
  | 'reservation'        // reserved against an order
  | 'release';           // release a reservation

export interface IStockMovement extends Document {
  productId: Types.ObjectId;
  variantId?: Types.ObjectId;
  sellerId: Types.ObjectId;
  warehouseId?: string;
  type: MovementType;
  quantity: number;          // positive = in, negative = out
  balanceBefore: number;     // onHand before
  balanceAfter: number;      // onHand after
  // Reference (order, return, transfer, purchase order, etc.)
  referenceType?: string;
  referenceId?: Types.ObjectId;
  // Cost snapshot
  unitCost?: number;
  currency?: string;
  note?: string;
  performedBy?: Types.ObjectId;       // user/admin who triggered the movement
  createdAt: Date;
  updatedAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'Variant', index: true, sparse: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    warehouseId: { type: String, default: 'default', index: true },
    type: { type: String, enum: ['purchase', 'return_in', 'adjustment_in', 'transfer_in', 'order_out', 'return_out', 'adjustment_out', 'transfer_out', 'damage', 'reservation', 'release'], required: true, index: true },
    quantity: { type: Number, required: true },
    balanceBefore: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true, min: 0 },
    referenceType: { type: String },
    referenceId: { type: Schema.Types.ObjectId, index: true, sparse: true },
    unitCost: { type: Number, min: 0 },
    currency: { type: String, default: 'INR' },
    note: { type: String, maxlength: 500 },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
  },
  { timestamps: true }
);

StockMovementSchema.index({ productId: 1, createdAt: -1 });
StockMovementSchema.index({ referenceType: 1, referenceId: 1 });

export const StockMovementModel = mongoose.model<IStockMovement>('StockMovement', StockMovementSchema, 'inventory_movements');
