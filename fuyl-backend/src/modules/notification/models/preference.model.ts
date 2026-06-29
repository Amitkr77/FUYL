import mongoose, { Schema, Document } from 'mongoose';

export type NotificationPreference = 'enabled' | 'disabled';

export interface INotificationPreference extends Document {
  userId: mongoose.Types.ObjectId;
  email: NotificationPreference;
  sms: NotificationPreference;
  whatsapp: NotificationPreference;
  push: NotificationPreference;
  // Per-category overrides (e.g. 'marketing', 'transactional', 'subscription', 'referral')
  categoryOverrides: Map<string, NotificationPreference>;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationPreferenceSchema = new Schema<INotificationPreference>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    email: { type: String, enum: ['enabled', 'disabled'], default: 'enabled' },
    sms: { type: String, enum: ['enabled', 'disabled'], default: 'enabled' },
    whatsapp: { type: String, enum: ['enabled', 'disabled'], default: 'enabled' },
    push: { type: String, enum: ['enabled', 'disabled'], default: 'enabled' },
    categoryOverrides: { type: Map, of: { type: String, enum: ['enabled', 'disabled'] }, default: {} },
  },
  { timestamps: true }
);

export const NotificationPreferenceModel = mongoose.model<INotificationPreference>(
  'NotificationPreference',
  NotificationPreferenceSchema,
  'notification_preferences'
);
