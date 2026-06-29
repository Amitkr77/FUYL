import { Types } from 'mongoose';
import { ICampaign, CampaignModel } from '../models/campaign.model';

export class CampaignRepository {
  async create(data: Partial<ICampaign>): Promise<ICampaign> {
    return CampaignModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<ICampaign | null> {
    return CampaignModel.findById(id);
  }

  async findAll(filter: Record<string, unknown> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      CampaignModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      CampaignModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async findActive(): Promise<ICampaign[]> {
    const now = new Date();
    return CampaignModel.find({
      status: 'active',
      isActive: true,
      $or: [{ endsAt: { $exists: false } }, { endsAt: { $gte: now } }],
      startsAt: { $lte: now },
    });
  }

  async findFeatured(): Promise<ICampaign[]> {
    const now = new Date();
    return CampaignModel.find({
      status: 'active',
      isActive: true,
      isFeatured: true,
      $or: [{ endsAt: { $exists: false } }, { endsAt: { $gte: now } }],
      startsAt: { $lte: now },
    });
  }

  async findByCouponCode(code: string): Promise<ICampaign | null> {
    return CampaignModel.findOne({ 'coupons.code': code.toUpperCase().trim() });
  }

  async update(id: string, patch: Partial<ICampaign>): Promise<ICampaign | null> {
    return CampaignModel.findByIdAndUpdate(id, { $set: patch }, { new: true });
  }

  async delete(id: string): Promise<void> {
    await CampaignModel.findByIdAndDelete(id);
  }

  /**
   * Increment the redemption counter for a specific coupon code.
   */
  async incrementCouponRedemption(code: string): Promise<void> {
    await CampaignModel.updateOne(
      { 'coupons.code': code.toUpperCase().trim() },
      { $inc: { 'coupons.$.redemptionsCount': 1 } }
    );
  }

  async decrementCouponRedemption(code: string): Promise<void> {
    await CampaignModel.updateOne(
      { 'coupons.code': code.toUpperCase().trim() },
      { $inc: { 'coupons.$.redemptionsCount': -1 } }
    );
  }
}
