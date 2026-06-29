import { IReferralReward, ReferralRewardModel } from '../models/reward.model';
import mongoose, { Types } from 'mongoose';

export class RewardRepository {
  async create(data: Partial<IReferralReward>): Promise<IReferralReward> {
    return ReferralRewardModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<IReferralReward | null> {
    return ReferralRewardModel.findById(id);
  }

  async findByReferral(referralId: string | Types.ObjectId): Promise<IReferralReward[]> {
    return ReferralRewardModel.find({ referralId });
  }

  async findByUser(userId: string | Types.ObjectId, filter: { isReversed?: boolean } = {}) {
    return ReferralRewardModel
      .find({ userId, ...filter })
      .sort({ createdAt: -1 });
  }

  async totalEarnedByUser(userId: string | Types.ObjectId): Promise<number> {
    const agg = await ReferralRewardModel.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId.toString()), isReversed: false } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return agg[0]?.total ?? 0;
  }

  async reverse(id: string | Types.ObjectId, reason: string): Promise<IReferralReward | null> {
    return ReferralRewardModel.findByIdAndUpdate(
      id,
      { $set: { isReversed: true, reversedAt: new Date(), reversedReason: reason } },
      { new: true }
    );
  }
}
