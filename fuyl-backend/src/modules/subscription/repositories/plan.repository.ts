import { FilterQuery } from 'mongoose';
import { ISubscriptionPlan, SubscriptionPlanModel } from '../models/plan.model';
import { CreatePlanInput, UpdatePlanInput } from '../interfaces';

export class PlanRepository {
  async create(data: CreatePlanInput): Promise<ISubscriptionPlan> {
    return SubscriptionPlanModel.create(data);
  }

  async findById(id: string): Promise<ISubscriptionPlan | null> {
    return SubscriptionPlanModel.findById(id);
  }

  async findActive(): Promise<ISubscriptionPlan[]> {
    return SubscriptionPlanModel.find({ isActive: true }).sort({ createdAt: -1 });
  }

  /**
   * The active plan for a given interval — the platform runs one plan set per
   * interval (weekly/monthly/…), so this resolves the authoritative discount
   * for a "subscribe & save" cart line. Newest active plan wins if more than
   * one exists for the interval.
   */
  async findActiveByInterval(
    interval: ISubscriptionPlan['interval']
  ): Promise<ISubscriptionPlan | null> {
    return SubscriptionPlanModel.findOne({ interval, isActive: true }).sort({ createdAt: -1 });
  }

  async findAll(filter: FilterQuery<ISubscriptionPlan> = {}, opts: { page: number; limit: number } = { page: 1, limit: 20 }) {
    const skip = (opts.page - 1) * opts.limit;
    const [items, total] = await Promise.all([
      SubscriptionPlanModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(opts.limit),
      SubscriptionPlanModel.countDocuments(filter),
    ]);
    return { items, total, page: opts.page, limit: opts.limit };
  }

  async update(id: string, data: UpdatePlanInput): Promise<ISubscriptionPlan | null> {
    return SubscriptionPlanModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  }

  async delete(id: string): Promise<void> {
    await SubscriptionPlanModel.findByIdAndUpdate(id, { isActive: false });
  }
}
