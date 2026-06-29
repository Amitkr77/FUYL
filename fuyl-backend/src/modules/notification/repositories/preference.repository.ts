import { Types } from 'mongoose';
import { INotificationPreference, NotificationPreferenceModel } from '../models/preference.model';

export class NotificationPreferenceRepository {
  async findByUser(userId: string | Types.ObjectId): Promise<INotificationPreference | null> {
    return NotificationPreferenceModel.findOne({ userId });
  }

  async findOrCreate(userId: string | Types.ObjectId): Promise<INotificationPreference> {
    const existing = await NotificationPreferenceModel.findOne({ userId });
    if (existing) return existing;
    return NotificationPreferenceModel.create({
      userId: new Types.ObjectId(userId.toString()),
      email: 'enabled',
      sms: 'enabled',
      whatsapp: 'enabled',
      push: 'enabled',
      categoryOverrides: new Map(),
    });
  }

  async update(userId: string | Types.ObjectId, patch: Partial<INotificationPreference>): Promise<INotificationPreference | null> {
    return NotificationPreferenceModel.findOneAndUpdate(
      { userId },
      { $set: patch },
      { new: true, upsert: true }
    );
  }

  async setCategoryOverride(
    userId: string | Types.ObjectId,
    category: string,
    preference: 'enabled' | 'disabled'
  ): Promise<INotificationPreference | null> {
    return NotificationPreferenceModel.findOneAndUpdate(
      { userId },
      { $set: { [`categoryOverrides.${category}`]: preference } },
      { new: true, upsert: true }
    );
  }

  async isChannelEnabled(
    userId: string | Types.ObjectId,
    channel: 'email' | 'sms' | 'whatsapp' | 'push',
    category?: string
  ): Promise<boolean> {
    const pref = await NotificationPreferenceModel.findOne({ userId }).lean();
    if (!pref) return true; // default: enabled

    if (category) {
      const overrides = pref.categoryOverrides as unknown as Map<string, string> | undefined;
      const override = overrides?.get(category);
      if (override === 'enabled') return true;
      if (override === 'disabled') return false;
    }
    const channelPref = pref[channel] as unknown as string | undefined;
    return channelPref !== 'disabled'; // default enabled
  }
}
