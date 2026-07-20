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
   * Increment the redemption counter for a coupon. When `maxGlobal` is given,
   * the increment is applied atomically ONLY if the counter is still below the
   * cap (`$elemMatch` + positional `$`), so concurrent redemptions can't drive
   * the counter past the global limit. Returns true if it incremented, false if
   * the cap was already reached (counter left untouched).
   */
  async incrementCouponRedemption(code: string, maxGlobal?: number): Promise<boolean> {
    const trimmed = code.toUpperCase().trim();
    const filter =
      maxGlobal === undefined
        ? { 'coupons.code': trimmed }
        : { coupons: { $elemMatch: { code: trimmed, redemptionsCount: { $lt: maxGlobal } } } };
    const res = await CampaignModel.updateOne(filter, { $inc: { 'coupons.$.redemptionsCount': 1 } });
    return res.modifiedCount > 0;
  }

  async decrementCouponRedemption(code: string): Promise<void> {
    await CampaignModel.updateOne(
      { 'coupons.code': code.toUpperCase().trim() },
      { $inc: { 'coupons.$.redemptionsCount': -1 } }
    );
  }
}
