import { Types } from 'mongoose';
import { AffiliatePayoutModel, IAffiliatePayout } from '../models/payout.model';

export class PayoutRepository {
  async create(data: Partial<IAffiliatePayout>): Promise<IAffiliatePayout> {
    return AffiliatePayoutModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<IAffiliatePayout | null> {
    return AffiliatePayoutModel.findById(id);
  }

  async findByAffiliate(affiliateId: string | Types.ObjectId): Promise<IAffiliatePayout[]> {
    return AffiliatePayoutModel.find({ affiliateId }).sort({ createdAt: -1 });
  }

  async update(id: string | Types.ObjectId, patch: Partial<IAffiliatePayout>): Promise<IAffiliatePayout | null> {
    return AffiliatePayoutModel.findByIdAndUpdate(id, { $set: patch }, { new: true });
  }

  async paginate(page = 1, limit = 20, filter: Record<string, unknown> = {}) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      AffiliatePayoutModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('affiliateId', 'name email'),
      AffiliatePayoutModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }
}
