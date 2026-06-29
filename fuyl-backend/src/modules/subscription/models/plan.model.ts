import mongoose, { Schema, Document } from 'mongoose';
import { SubscriptionInterval } from '../../../shared/enums';

export interface ISubscriptionPlan extends Document {
  name: string;
  description?: string;
  interval: typeof SubscriptionInterval[keyof typeof SubscriptionInterval];
  intervalCount: number;        // every N intervals (e.g. every 2 weeks)
  discountPercent: number;      // 0-100
  freeShipping: boolean;
  priceLock: boolean;           // guarantees the day-0 price for the life of subscription
  maxSkipCount: number;         // how many consecutive skips allowed per year
  isActive: boolean;
  sellerId?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    interval: { type: String, enum: Object.values(SubscriptionInterval), required: true },
    intervalCount: { type: Number, default: 1, min: 1 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    freeShipping: { type: Boolean, default: false },
    priceLock: { type: Boolean, default: false },
    maxSkipCount: { type: Number, default: 4, min: 0 },
    isActive: { type: Boolean, default: true, index: true },
    sellerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

SubscriptionPlanSchema.index({ interval: 1, isActive: 1 });

export const SubscriptionPlanModel = mongoose.model<ISubscriptionPlan>(
  'SubscriptionPlan',
  SubscriptionPlanSchema,
  'subscription_plans'
);
