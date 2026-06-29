import { Types } from 'mongoose';
import { ICouponRedemption, CouponRedemptionModel } from '../models/redemption.model';

export class RedemptionRepository {
  async create(data: Partial<ICouponRedemption>): Promise<ICouponRedemption> {
    return CouponRedemptionModel.create(data);
  }

  async findById(id: string): Promise<ICouponRedemption | null> {
    return CouponRedemptionModel.findById(id);
  }

  async findByUserAndCode(userId: string | Types.ObjectId, code: string): Promise<ICouponRedemption[]> {
    return CouponRedemptionModel.find({
      userId: new Types.ObjectId(userId.toString()),
      couponCode: code.toUpperCase().trim(),
      status: 'applied',
    });
  }

  async countByUserAndCode(userId: string | Types.ObjectId, code: string): Promise<number> {
    return CouponRedemptionModel.countDocuments({
      userId: new Types.ObjectId(userId.toString()),
      couponCode: code.toUpperCase().trim(),
      status: 'applied',
    });
  }

  async findByOrder(orderId: string | Types.ObjectId): Promise<ICouponRedemption[]> {
    return CouponRedemptionModel.find({ orderId: new Types.ObjectId(orderId.toString()) });
  }

  async markReverted(id: string | Types.ObjectId): Promise<void> {
    await CouponRedemptionModel.findByIdAndUpdate(id, {
      $set: { status: 'reverted', revertedAt: new Date() },
    });
  }

  async listByUser(userId: string | Types.ObjectId, limit = 50) {
    return CouponRedemptionModel
      .find({ userId: new Types.ObjectId(userId.toString()) })
      .sort({ appliedAt: -1 })
      .limit(limit);
  }

  async paginate(filter: Record<string, unknown> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      CouponRedemptionModel.find(filter).sort({ appliedAt: -1 }).skip(skip).limit(limit),
      CouponRedemptionModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async stats() {
    const [byStatus, totals] = await Promise.all([
      CouponRedemptionModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 }, discount: { $sum: '$discountAmount' } } },
      ]),
      CouponRedemptionModel.aggregate([
        { $match: { status: 'applied' } },
        { $group: { _id: null, totalDiscount: { $sum: '$discountAmount' }, count: { $sum: 1 } } },
      ]),
    ]);
    return {
      byStatus,
      totalDiscount: totals[0]?.totalDiscount ?? 0,
      totalRedemptions: totals[0]?.count ?? 0,
    };
  }
}
