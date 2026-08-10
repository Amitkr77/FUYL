import { FilterQuery, Types } from 'mongoose';
import { CommissionModel, ICommission } from '../models/commission.model';
import { CommissionEventModel } from '../models/commission-event.model';
import { CommissionStatus, CommissionEventType } from '../../../shared/enums';

export class CommissionRepository {
  async create(data: Partial<ICommission>): Promise<ICommission> {
    return CommissionModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<ICommission | null> {
    return CommissionModel.findById(id);
  }

  async findByOrderId(orderId: string | Types.ObjectId): Promise<ICommission | null> {
    return CommissionModel.findOne({ orderId });
  }

  async findByAffiliate(affiliateId: string | Types.ObjectId, filter: FilterQuery<ICommission> = {}) {
    return CommissionModel.find({ affiliateId, ...filter }).sort({ createdAt: -1 });
  }

  /** Atomically claim status transition — idempotent. Returns null if already in target status. */
  async claimTransition(
    id: string | Types.ObjectId,
    fromStatus: string,
    toStatus: string,
    patch: Partial<ICommission> = {}
  ): Promise<ICommission | null> {
    return CommissionModel.findOneAndUpdate(
      { _id: id, status: fromStatus },
      { $set: { status: toStatus, ...patch } },
      { new: true }
    );
  }

  async paginate(filter: FilterQuery<ICommission> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      CommissionModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('affiliateId', 'name email')
        .populate('orderId', 'orderNumber grandTotal'),
      CommissionModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async adminStats() {
    const agg = await CommissionModel.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$amount' },
        },
      },
    ]);
    const result: Record<string, { count: number; total: number }> = {};
    for (const row of agg) result[row._id] = { count: row.count, total: row.total };
    return result;
  }

  async payableByAffiliate(affiliateId: string | Types.ObjectId): Promise<ICommission[]> {
    return CommissionModel.find({ affiliateId, status: CommissionStatus.PAYABLE });
  }

  // ─── Audit ledger ─────────────────────────────────────────────────────────

  async appendEvent(data: {
    commissionId: string | Types.ObjectId;
    affiliateId:  string | Types.ObjectId;
    eventType:    typeof CommissionEventType[keyof typeof CommissionEventType];
    amountDelta:  number;
    actorId?:     string | Types.ObjectId;
    note?:        string;
  }) {
    return CommissionEventModel.create(data);
  }

  async events(commissionId: string | Types.ObjectId) {
    return CommissionEventModel.find({ commissionId }).sort({ createdAt: 1 });
  }
}
