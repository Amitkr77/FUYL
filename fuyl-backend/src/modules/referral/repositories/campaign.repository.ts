import { FilterQuery } from 'mongoose';
import { IReferralCampaign, ReferralCampaignModel } from '../models/campaign.model';
import { CreateCampaignInput, UpdateCampaignInput } from '../interfaces';

export class CampaignRepository {
  async create(data: CreateCampaignInput): Promise<IReferralCampaign> {
    return ReferralCampaignModel.create(data);
  }

  async findById(id: string): Promise<IReferralCampaign | null> {
    return ReferralCampaignModel.findById(id);
  }

  async findActive(now: Date = new Date()): Promise<IReferralCampaign | null> {
    return ReferralCampaignModel.findOne({
      isActive: true,
      startsAt: { $lte: now },
      $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gt: now } }],
    }).sort({ createdAt: -1 });
  }

  async findAll(filter: FilterQuery<IReferralCampaign> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      ReferralCampaignModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ReferralCampaignModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async update(id: string, data: UpdateCampaignInput): Promise<IReferralCampaign | null> {
    return ReferralCampaignModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  }

  async deactivate(id: string): Promise<void> {
    await ReferralCampaignModel.findByIdAndUpdate(id, { isActive: false });
  }
}
