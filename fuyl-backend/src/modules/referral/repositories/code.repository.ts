import { IReferralCode, ReferralCodeModel } from '../models/code.model';

export class CodeRepository {
  async create(data: Partial<IReferralCode>): Promise<IReferralCode> {
    return ReferralCodeModel.create(data);
  }

  async findByCode(code: string): Promise<IReferralCode | null> {
    return ReferralCodeModel.findOne({ code: code.toLowerCase() });
  }

  async findByReferrer(referrerId: string): Promise<IReferralCode[]> {
    return ReferralCodeModel.find({ referrerId }).sort({ createdAt: -1 });
  }

  async findActiveByReferrer(referrerId: string): Promise<IReferralCode | null> {
    return ReferralCodeModel.findOne({ referrerId, isActive: true }).sort({ createdAt: -1 });
  }

  async incrementUses(code: string): Promise<IReferralCode | null> {
    return ReferralCodeModel.findOneAndUpdate(
      { code: code.toLowerCase() },
      { $inc: { usesCount: 1 } },
      { new: true }
    );
  }

  async deactivate(id: string): Promise<void> {
    await ReferralCodeModel.findByIdAndUpdate(id, { isActive: false });
  }
}
