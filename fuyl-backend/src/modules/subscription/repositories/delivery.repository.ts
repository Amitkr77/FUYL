import { ISubscriptionDelivery, SubscriptionDeliveryModel } from '../models/delivery.model';
import { Types } from 'mongoose';

export class DeliveryRepository {
  async create(data: Partial<ISubscriptionDelivery>): Promise<ISubscriptionDelivery> {
    return SubscriptionDeliveryModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<ISubscriptionDelivery | null> {
    return SubscriptionDeliveryModel.findById(id);
  }

  async findBySubscription(subscriptionId: string | Types.ObjectId, limit = 50): Promise<ISubscriptionDelivery[]> {
    return SubscriptionDeliveryModel
      .find({ subscriptionId })
      .sort({ cycleNumber: -1 })
      .limit(limit);
  }

  async findScheduledForDate(date: Date): Promise<ISubscriptionDelivery[]> {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);
    return SubscriptionDeliveryModel
      .find({ scheduledFor: { $gte: start, $lte: end }, status: 'scheduled' })
      .sort({ scheduledFor: 1 });
  }

  async findDueReminders(daysAhead: number, limit = 500): Promise<ISubscriptionDelivery[]> {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + daysAhead);
    return SubscriptionDeliveryModel
      .find({
        scheduledFor: { $gte: start, $lte: end },
        status: 'scheduled',
      })
      .sort({ scheduledFor: 1 })
      .limit(limit);
  }

  async markStatus(id: string | Types.ObjectId, status: ISubscriptionDelivery['status'], patch: Partial<ISubscriptionDelivery> = {}) {
    return SubscriptionDeliveryModel.findByIdAndUpdate(
      id,
      { $set: { status, ...patch } },
      { new: true }
    );
  }

  async nextCycleNumber(subscriptionId: string | Types.ObjectId): Promise<number> {
    const last = await SubscriptionDeliveryModel
      .findOne({ subscriptionId })
      .sort({ cycleNumber: -1 })
      .select('cycleNumber');
    return (last?.cycleNumber ?? 0) + 1;
  }
}
