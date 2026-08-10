import { Types } from 'mongoose';
import { AffiliateLinkModel, IAffiliateLink } from '../models/link.model';

export class LinkRepository {
  async create(data: Partial<IAffiliateLink>): Promise<IAffiliateLink> {
    return AffiliateLinkModel.create(data);
  }

  async findByCode(code: string): Promise<IAffiliateLink | null> {
    return AffiliateLinkModel.findOne({ code: code.toUpperCase(), isActive: true });
  }

  async findById(id: string | Types.ObjectId): Promise<IAffiliateLink | null> {
    return AffiliateLinkModel.findById(id);
  }

  async findByAffiliate(affiliateId: string | Types.ObjectId): Promise<IAffiliateLink[]> {
    return AffiliateLinkModel.find({ affiliateId }).sort({ createdAt: -1 });
  }

  async update(id: string | Types.ObjectId, patch: Partial<IAffiliateLink>): Promise<IAffiliateLink | null> {
    return AffiliateLinkModel.findByIdAndUpdate(id, { $set: patch }, { new: true });
  }
}
