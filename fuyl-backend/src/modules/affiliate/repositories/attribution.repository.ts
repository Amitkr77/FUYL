import { Types } from 'mongoose';
import { AffiliateAttributionModel, IAffiliateAttribution } from '../models/attribution.model';

export class AttributionRepository {
  async create(data: Partial<IAffiliateAttribution>): Promise<IAffiliateAttribution> {
    return AffiliateAttributionModel.create(data);
  }

  async findByToken(token: string): Promise<IAffiliateAttribution | null> {
    return AffiliateAttributionModel.findOne({ token, converted: false, expiresAt: { $gt: new Date() } });
  }

  async findById(id: string | Types.ObjectId): Promise<IAffiliateAttribution | null> {
    return AffiliateAttributionModel.findById(id);
  }

  async markConverted(id: string | Types.ObjectId, orderId: string | Types.ObjectId): Promise<void> {
    await AffiliateAttributionModel.updateOne(
      { _id: id },
      { $set: { converted: true, orderId } }
    );
  }
}
