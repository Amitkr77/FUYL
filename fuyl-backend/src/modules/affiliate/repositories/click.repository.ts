import { Types } from 'mongoose';
import { AffiliateClickModel, IAffiliateClick } from '../models/click.model';

export class ClickRepository {
  async create(data: Partial<IAffiliateClick>): Promise<IAffiliateClick> {
    return AffiliateClickModel.create(data);
  }

  async countByAffiliate(affiliateId: string | Types.ObjectId): Promise<number> {
    return AffiliateClickModel.countDocuments({ affiliateId });
  }

  async markConverted(clickId: string | Types.ObjectId, orderId: string | Types.ObjectId): Promise<void> {
    await AffiliateClickModel.updateOne({ _id: clickId }, { $set: { converted: true, orderId } });
  }

  async recentByAffiliate(affiliateId: string | Types.ObjectId, limit = 50): Promise<IAffiliateClick[]> {
    return AffiliateClickModel.find({ affiliateId }).sort({ createdAt: -1 }).limit(limit);
  }
}
