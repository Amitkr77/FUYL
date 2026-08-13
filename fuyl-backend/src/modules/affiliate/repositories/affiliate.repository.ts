import { FilterQuery, Types } from 'mongoose';
import { AffiliateModel, IAffiliate } from '../models/affiliate.model';
import { AffiliateStatus } from '../../../shared/enums';

export class AffiliateRepository {
  async create(data: Partial<IAffiliate>): Promise<IAffiliate> {
    return AffiliateModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<IAffiliate | null> {
    return AffiliateModel.findById(id);
  }

  async findByEmail(email: string): Promise<IAffiliate | null> {
    return AffiliateModel.findOne({ email: email.toLowerCase() });
  }

  async findByUserId(userId: string | Types.ObjectId): Promise<IAffiliate | null> {
    return AffiliateModel.findOne({ userId });
  }

  async update(id: string | Types.ObjectId, patch: Partial<IAffiliate>): Promise<IAffiliate | null> {
    return AffiliateModel.findByIdAndUpdate(id, { $set: patch }, { new: true });
  }

  async incrementStats(
    id: string | Types.ObjectId,
    inc: Partial<{
      totalClicks: number;
      totalOrders: number;
      totalRevenue: number;
      totalCommissionEarned: number;
      totalCommissionPaid: number;
    }>
  ): Promise<void> {
    const fields: Record<string, number> = {};
    for (const [k, v] of Object.entries(inc)) {
      fields[`stats.${k}`] = v as number;
    }
    await AffiliateModel.updateOne({ _id: id }, { $inc: fields });
  }

  async paginate(
    filter: FilterQuery<IAffiliate> = {},
    page = 1,
    limit = 20,
    sort: Record<string, 1 | -1> = { createdAt: -1 }
  ) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      AffiliateModel.find(filter)
        .select('-paymentInfo')   // PII — only returned by the single-affiliate detail endpoint
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('programId', 'name defaultRate'),
      AffiliateModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async adminDetail(id: string | Types.ObjectId): Promise<IAffiliate | null> {
    return AffiliateModel.findById(id).populate('programId', 'name defaultRate commissionBase');
  }

  async adminStats() {
    const [total, pending, approved, suspended] = await Promise.all([
      AffiliateModel.countDocuments(),
      AffiliateModel.countDocuments({ status: AffiliateStatus.PENDING }),
      AffiliateModel.countDocuments({ status: AffiliateStatus.APPROVED }),
      AffiliateModel.countDocuments({ status: AffiliateStatus.SUSPENDED }),
    ]);
    return { total, pending, approved, suspended };
  }

  async countByProgram(programId: string | Types.ObjectId): Promise<number> {
    return AffiliateModel.countDocuments({ programId });
  }
}
