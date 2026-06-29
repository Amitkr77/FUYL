import { IReferralFraudFlag, ReferralFraudFlagModel } from '../models/fraudFlag.model';
import mongoose from 'mongoose';

export class FraudFlagRepository {
  async create(data: Partial<IReferralFraudFlag>): Promise<IReferralFraudFlag> {
    return ReferralFraudFlagModel.create(data);
  }

  async findById(id: string): Promise<IReferralFraudFlag | null> {
    return ReferralFraudFlagModel.findById(id);
  }

  async findByReferral(referralId: string): Promise<IReferralFraudFlag | null> {
    return ReferralFraudFlagModel.findOne({ referralId: new mongoose.Types.ObjectId(referralId) });
  }

  async findPending(limit = 50) {
    return ReferralFraudFlagModel
      .find({ reviewDecision: { $exists: false } })
      .sort({ severity: -1, createdAt: -1 })
      .limit(limit);
  }

  async findByFingerprint(fingerprint: string, excludeReferralId?: string) {
    return ReferralFraudFlagModel
      .find({
        deviceFingerprint: fingerprint,
        ...(excludeReferralId ? { referralId: { $ne: new mongoose.Types.ObjectId(excludeReferralId) } } : {}),
      })
      .limit(10);
  }

  async findByIpHash(ipHash: string, excludeReferralId?: string) {
    return ReferralFraudFlagModel
      .find({
        ipHash,
        ...(excludeReferralId ? { referralId: { $ne: new mongoose.Types.ObjectId(excludeReferralId) } } : {}),
      })
      .limit(10);
  }

  async findByPhoneHash(phoneHash: string) {
    return ReferralFraudFlagModel.find({ phoneHash }).limit(10);
  }

  async review(id: string, decision: 'approved' | 'rejected', reviewerId: string, note?: string) {
    return ReferralFraudFlagModel.findByIdAndUpdate(
      id,
      {
        $set: {
          reviewDecision: decision,
          reviewedAt: new Date(),
          reviewedBy: new mongoose.Types.ObjectId(reviewerId),
          reviewNote: note,
        },
      },
      { new: true }
    );
  }

  async paginate(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      ReferralFraudFlagModel.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      ReferralFraudFlagModel.countDocuments({}),
    ]);
    return { items, total, page, limit };
  }
}
