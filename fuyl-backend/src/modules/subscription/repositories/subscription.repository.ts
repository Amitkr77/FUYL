import { FilterQuery, Types } from 'mongoose';
import { ISubscription, SubscriptionModel } from '../models/subscription.model';
import { SubscriptionStatus } from '../../../shared/enums';
import { CreateSubscriptionInput } from '../interfaces';

export class SubscriptionRepository {
  async create(data: Partial<ISubscription>): Promise<ISubscription> {
    return SubscriptionModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<ISubscription | null> {
    return SubscriptionModel.findById(id);
  }

  async findByRazorpaySubscriptionId(id: string): Promise<ISubscription | null> {
    return SubscriptionModel.findOne({ razorpaySubscriptionId: id });
  }

  async findByCustomer(customerId: string | Types.ObjectId, filter: FilterQuery<ISubscription> = {}) {
    return SubscriptionModel.find({ customerId, ...filter }).sort({ createdAt: -1 });
  }

  async findDueForBilling(now: Date, limit = 500): Promise<ISubscription[]> {
    return SubscriptionModel
      .find({
        status: SubscriptionStatus.ACTIVE,
        nextDeliveryDate: { $lte: now },
      })
      .sort({ nextDeliveryDate: 1 })
      .limit(limit);
  }

  async findFailedForDunning(limit = 200): Promise<ISubscription[]> {
    return SubscriptionModel
      .find({
        status: SubscriptionStatus.PAST_DUE,
        consecutiveFailures: { $lt: 3 },
      })
      .limit(limit);
  }

  async update(id: string | Types.ObjectId, patch: Partial<ISubscription>): Promise<ISubscription | null> {
    return SubscriptionModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true });
  }

  async updateStatus(id: string | Types.ObjectId, status: string, extra: Partial<ISubscription> = {}) {
    return SubscriptionModel.findByIdAndUpdate(id, { $set: { status, ...extra } }, { new: true });
  }

  async incrementFailure(id: string | Types.ObjectId): Promise<ISubscription | null> {
    return SubscriptionModel.findByIdAndUpdate(
      id,
      { $inc: { consecutiveFailures: 1, totalCyclesFailed: 1 } },
      { new: true }
    );
  }

  async resetFailures(id: string | Types.ObjectId): Promise<ISubscription | null> {
    return SubscriptionModel.findByIdAndUpdate(
      id,
      { $set: { consecutiveFailures: 0 } },
      { new: true }
    );
  }

  async incrementCycle(id: string | Types.ObjectId): Promise<ISubscription | null> {
    return SubscriptionModel.findByIdAndUpdate(
      id,
      { $inc: { totalCyclesExecuted: 1 } },
      { new: true }
    );
  }

  async paginate(filter: FilterQuery<ISubscription> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      SubscriptionModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      SubscriptionModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async statsForAdmin() {
    const [activeCount, pausedCount, pastDueCount, cancelledCount] = await Promise.all([
      SubscriptionModel.countDocuments({ status: SubscriptionStatus.ACTIVE }),
      SubscriptionModel.countDocuments({ status: SubscriptionStatus.PAUSED }),
      SubscriptionModel.countDocuments({ status: SubscriptionStatus.PAST_DUE }),
      SubscriptionModel.countDocuments({ status: SubscriptionStatus.CANCELLED }),
    ]);
    const mrrAgg = await SubscriptionModel.aggregate([
      { $match: { status: SubscriptionStatus.ACTIVE } },
      { $group: { _id: null, total: { $sum: '$finalPrice' } } },
    ]);
    return {
      active: activeCount,
      paused: pausedCount,
      pastDue: pastDueCount,
      cancelled: cancelledCount,
      mrr: mrrAgg[0]?.total ?? 0,
    };
  }
}
