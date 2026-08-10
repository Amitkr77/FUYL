import mongoose, { FilterQuery } from 'mongoose';
import { CashbackPolicyModel, ICashbackPolicy } from '../models/cashbackPolicy.model';
import { CashbackEarningModel, ICashbackEarning } from '../models/cashbackEarning.model';

export class CashbackPolicyRepository {
  async create(data: Partial<ICashbackPolicy>): Promise<ICashbackPolicy> {
    return CashbackPolicyModel.create(data);
  }

  async findById(id: string): Promise<ICashbackPolicy | null> {
    return CashbackPolicyModel.findById(id);
  }

  async findActive(): Promise<ICashbackPolicy[]> {
    const now = new Date();
    return CashbackPolicyModel.find({
      isActive: true,
      $or: [{ startDate: { $exists: false } }, { startDate: { $lte: now } }],
      $and: [
        { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }] },
      ],
    });
  }

  async findActiveStandalone(): Promise<ICashbackPolicy[]> {
    const now = new Date();
    return CashbackPolicyModel.find({
      mode: 'standalone',
      isActive: true,
      $or: [{ startDate: { $exists: false } }, { startDate: { $lte: now } }],
      $and: [
        { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }] },
      ],
    });
  }

  async findActiveByCoupon(couponCode: string): Promise<ICashbackPolicy | null> {
    const now = new Date();
    return CashbackPolicyModel.findOne({
      mode: 'attached',
      couponCode: couponCode.toUpperCase(),
      isActive: true,
      $or: [{ startDate: { $exists: false } }, { startDate: { $lte: now } }],
      $and: [
        { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }] },
      ],
    });
  }

  async findAll(filter: FilterQuery<ICashbackPolicy> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      CashbackPolicyModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      CashbackPolicyModel.countDocuments(filter),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async update(id: string, patch: Partial<ICashbackPolicy>): Promise<ICashbackPolicy | null> {
    return CashbackPolicyModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true });
  }

  async incrementUsedBudget(id: string, amount: number): Promise<void> {
    await CashbackPolicyModel.updateOne({ _id: id }, { $inc: { usedBudget: amount } });
  }

  async delete(id: string): Promise<void> {
    await CashbackPolicyModel.findByIdAndDelete(id);
  }
}

export class CashbackEarningRepository {
  async create(data: Partial<ICashbackEarning>): Promise<ICashbackEarning> {
    return CashbackEarningModel.create(data);
  }

  async findById(id: string): Promise<ICashbackEarning | null> {
    return CashbackEarningModel.findById(id);
  }

  async findByOrder(orderId: string): Promise<ICashbackEarning[]> {
    return CashbackEarningModel.find({ orderId });
  }

  async findByUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      CashbackEarningModel.find({ userId }).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('policyId', 'name'),
      CashbackEarningModel.countDocuments({ userId }),
    ]);
    return { items, total, page, limit };
  }

  /** Fetch pending earnings whose scheduledCreditAt is in the past — used by the cron job. */
  async findDuePending(limit = 100): Promise<ICashbackEarning[]> {
    return CashbackEarningModel.find({
      status: 'pending',
      scheduledCreditAt: { $lte: new Date() },
    }).limit(limit);
  }

  async updateStatus(
    id: string,
    status: ICashbackEarning['status'],
    extra: Partial<ICashbackEarning> = {}
  ): Promise<ICashbackEarning | null> {
    return CashbackEarningModel.findByIdAndUpdate(id, { $set: { status, ...extra } }, { new: true });
  }

  /**
   * Atomically transition a 'pending' earning to 'credited', stamping the wallet
   * transaction ID. Returns the updated document, or null if the earning was
   * not in 'pending' state (another process already handled it). This is the
   * idempotency guard that prevents double budget-increment under concurrency.
   */
  async claimCredited(
    id: string,
    walletTransactionId: mongoose.Types.ObjectId
  ): Promise<ICashbackEarning | null> {
    return CashbackEarningModel.findOneAndUpdate(
      { _id: id, status: 'pending' },
      { $set: { status: 'credited', creditedAt: new Date(), walletTransactionId } },
      { new: true }
    );
  }

  async findAll(filter: FilterQuery<ICashbackEarning> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      CashbackEarningModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).populate('policyId', 'name'),
      CashbackEarningModel.countDocuments(filter),
    ]);
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }

  /** Count how many times a user has earned from a specific policy. */
  async countUserEarnings(userId: string, policyId: string): Promise<number> {
    return CashbackEarningModel.countDocuments({ userId, policyId, status: { $ne: 'reversed' } });
  }
}
