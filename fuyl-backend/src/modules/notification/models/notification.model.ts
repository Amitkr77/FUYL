import mongoose, { Schema, Document } from 'mongoose';

export type NotificationStatus = 'queued' | 'sent' | 'failed' | 'skipped' | 'bounced';

export interface INotificationLog extends Document {
  userId?: mongoose.Types.ObjectId;
  channel: 'email' | 'sms' | 'whatsapp' | 'push';
  template: string;
  to: {
    email?: string;
    phone?: string;
    pushToken?: string;
  };
  data?: Record<string, unknown>;
  status: NotificationStatus;
  providerMessageId?: string;
  error?: string;
  attempts: number;
  scheduledAt?: Date;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationLogSchema = new Schema<INotificationLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
    channel: { type: String, enum: ['email', 'sms', 'whatsapp', 'push'], required: true, index: true },
    template: { type: String, required: true, index: true },
    to: {
      email: { type: String, index: true, sparse: true },
      phone: { type: String, index: true, sparse: true },
      pushToken: { type: String },
    },
    data: { type: Schema.Types.Mixed },
    status: { type: String, enum: ['queued', 'sent', 'failed', 'skipped', 'bounced'], default: 'queued', index: true },
    providerMessageId: { type: String },
    error: { type: String },
    attempts: { type: Number, default: 0, min: 0 },
    scheduledAt: { type: Date, index: true },
    sentAt: { type: Date },
  },
  { timestamps: true }
);

NotificationLogSchema.index({ userId: 1, createdAt: -1 });
NotificationLogSchema.index({ status: 1, scheduledAt: 1 });

export const NotificationLogModel = mongoose.model<INotificationLog>(
  'NotificationLog',
  NotificationLogSchema,
  'notification_logs'
);
