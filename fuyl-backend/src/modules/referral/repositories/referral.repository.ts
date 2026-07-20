import { FilterQuery, Types } from 'mongoose';
import { IReferral, ReferralModel } from '../models/referral.model';
import { ReferralStatus } from '../../../shared/enums';
import mongoose from 'mongoose';

export class ReferralRepository {
  async create(data: Partial<IReferral>): Promise<IReferral> {
    return ReferralModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<IReferral | null> {
    return ReferralModel.findById(id);
  }

  async findByReferee(refereeId: string | Types.ObjectId): Promise<IReferral | null> {
    return ReferralModel.findOne({ refereeId });
  }

  async findPendingByReferee(refereeId: string | Types.ObjectId): Promise<IReferral | null> {
    return ReferralModel.findOne({
      refereeId,
      status: { $in: [ReferralStatus.PENDING, ReferralStatus.ELIGIBLE] },
    });
  }

  async findByReferrer(referrerId: string | Types.ObjectId, filter: FilterQuery<IReferral> = {}) {
    return ReferralModel
      .find({ referrerId, ...filter })
      .sort({ createdAt: -1 });
  }

  async countByReferrer(referrerId: string | Types.ObjectId, status?: string): Promise<number> {
    const filter: FilterQuery<IReferral> = { referrerId };
    if (status) filter.status = status;
    return ReferralModel.countDocuments(filter);
  }

  async update(id: string | Types.ObjectId, patch: Partial<IReferral>): Promise<IReferral | null> {
    return ReferralModel.findByIdAndUpdate(id, { $set: patch }, { new: true });
  }

  async markStatus(id: string | Types.ObjectId, status: string, patch: Partial<IReferral> = {}) {
    return ReferralModel.findByIdAndUpdate(id, { $set: { status, ...patch } }, { new: true });
  }

  /**
   * Atomically transition a referral to REWARDED, but only if it isn't already
   * rewarded/completed. Returns the updated doc if THIS call won the claim, or
   * null if another (duplicate/concurrent) call already rewarded it. This is
   * the idempotency guard that makes reward granting safe under at-least-once
   * event delivery — the caller must only grant rewards when it gets a doc back.
   */
  async claimForReward(id: string | Types.ObjectId): Promise<IReferral | null> {
    return ReferralModel.findOneAndUpdate(
      { _id: id, status: { $nin: [ReferralStatus.REWARDED, ReferralStatus.COMPLETED] } },
      { $set: { status: ReferralStatus.REWARDED, rewardedAt: new Date() } },
      { new: true }
    );
  }

  async findExpiredPending(before: Date, limit = 500): Promise<IReferral[]> {
    return ReferralModel
      .find({
        status: ReferralStatus.PENDING,
        createdAt: { $lt: before },
      })
      .limit(limit);
  }

  async paginate(filter: FilterQuery<IReferral> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      ReferralModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ReferralModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async statsForAdmin() {
    const [total, shared, applied, rewarded, rejected, totalRewardsAgg] = await Promise.all([
      ReferralModel.countDocuments({}),
      ReferralModel.countDocuments({ status: ReferralStatus.SHARED }),
      ReferralModel.countDocuments({ status: { $in: [ReferralStatus.APPLIED, ReferralStatus.PENDING, ReferralStatus.ELIGIBLE] } }),
      ReferralModel.countDocuments({ status: { $in: [ReferralStatus.REWARDED, ReferralStatus.COMPLETED] } }),
      ReferralModel.countDocuments({ status: ReferralStatus.REJECTED }),
      ReferralModel.aggregate([
        { $match: { status: { $in: [ReferralStatus.REWARDED, ReferralStatus.COMPLETED] } } },
        { $group: { _id: null, total: { $sum: 1 } } },
      ]),
    ]);
    return {
      total,
      shared,
      inProgress: applied,
      rewarded,
      rejected,
      conversionRate: total > 0 ? (rewarded / total) * 100 : 0,
      totalRewardsPaid: totalRewardsAgg[0]?.total ?? 0,
    };
  }
}
