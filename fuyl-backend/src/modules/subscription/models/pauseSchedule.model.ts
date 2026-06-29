import mongoose, { Schema, Document } from 'mongoose';

export interface ISubscriptionPauseSchedule extends Document {
  subscriptionId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  startDate: Date;
  endDate?: Date;          // open-ended if undefined
  reason?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionPauseScheduleSchema = new Schema<ISubscriptionPauseSchedule>(
  {
    subscriptionId: { type: Schema.Types.ObjectId, ref: 'Subscription', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date },
    reason: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

SubscriptionPauseScheduleSchema.index({ subscriptionId: 1, isActive: 1 });

export const SubscriptionPauseScheduleModel = mongoose.model<ISubscriptionPauseSchedule>(
  'SubscriptionPauseSchedule',
  SubscriptionPauseScheduleSchema,
  'subscription_pause_schedules'
);
