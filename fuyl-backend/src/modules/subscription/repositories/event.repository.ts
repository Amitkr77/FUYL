import { ISubscriptionEvent, SubscriptionEventModel } from '../models/event.model';
import { Types } from 'mongoose';

export class EventRepository {
  async log(data: Partial<ISubscriptionEvent>): Promise<ISubscriptionEvent> {
    return SubscriptionEventModel.create(data);
  }

  async findBySubscription(subscriptionId: string | Types.ObjectId, limit = 100): Promise<ISubscriptionEvent[]> {
    return SubscriptionEventModel
      .find({ subscriptionId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }
}
