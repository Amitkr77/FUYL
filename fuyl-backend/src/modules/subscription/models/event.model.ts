import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionEvent extends Document {
  subscriptionId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  type: string;          // 'created' | 'activated' | 'charged' | 'failed' | 'paused' | 'resumed' | 'cancelled' | 'skipped' | 'frequency_changed'
  message: string;
  actor?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const SubscriptionEventSchema = new Schema<ISubscriptionEvent>(
  {
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    type: { type: String, required: true, index: true },
    message: { type: String, required: true },
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

SubscriptionEventSchema.index({ subscriptionId: 1, createdAt: -1 });

export const SubscriptionEventModel = mongoose.model<ISubscriptionEvent>(
  'SubscriptionEvent',
  SubscriptionEventSchema,
  'subscription_events'
);
