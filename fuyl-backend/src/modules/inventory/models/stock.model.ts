import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IInventoryStock extends Document {
  productId: Types.ObjectId;
  variantId?: Types.ObjectId;
  sellerId: Types.ObjectId;
  warehouseId?: string;
  // Quantities
  onHand: number;            // total physical stock at this location
  reserved: number;          // held for pending orders (not yet shipped)
  available: number;         // onHand - reserved (computed/cached)
  // Reorder thresholds
  reorderThreshold: number;
  reorderQuantity: number;
  // Tracking
  sku?: string;
  lowStockAlertSentAt?: Date;
  // Cost tracking (FIFO/LIFO/avg)
  averageCost?: number;
  lastCost?: number;
  currency?: string;
  // Perishable
  isPerishable: boolean;
  shelfLifeDays?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryStockSchema = new Schema<IInventoryStock>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'Variant', index: true, sparse: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    warehouseId: { type: String, default: 'default', index: true },
    onHand: { type: Number, default: 0, min: 0 },
    reserved: { type: Number, default: 0, min: 0 },
    available: { type: Number, default: 0, min: 0 },
    reorderThreshold: { type: Number, default: 0, min: 0 },
    reorderQuantity: { type: Number, default: 0, min: 0 },
    sku: { type: String, trim: true, index: true, sparse: true },
    lowStockAlertSentAt: { type: Date },
    averageCost: { type: Number, min: 0 },
    lastCost: { type: Number, min: 0 },
    currency: { type: String, default: 'INR' },
    isPerishable: { type: Boolean, default: false },
    shelfLifeDays: { type: Number, min: 0 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// Unique per product/variant/warehouse
InventoryStockSchema.index({ productId: 1, variantId: 1, warehouseId: 1 }, { unique: true, partialFilterExpression: { variantId: { $exists: true } } });
InventoryStockSchema.index({ productId: 1, warehouseId: 1 }, { unique: true, partialFilterExpression: { variantId: { $exists: false } } });

export const InventoryStockModel = mongoose.model<IInventoryStock>('InventoryStock', InventoryStockSchema, 'inventory_stocks');
