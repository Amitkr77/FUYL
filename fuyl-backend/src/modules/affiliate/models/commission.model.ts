import mongoose, { Schema, Document } from 'mongoose';
import { CommissionStatus } from '../../../shared/enums';

export interface ICommission extends Document {
  affiliateId:  mongoose.Types.ObjectId;
  orderId:      mongoose.Types.ObjectId;
  attributionId?: mongoose.Types.ObjectId;
  // Snapshot of the program rule at calculation time — never recalculate from live settings
  snapshotRate:       number;   // e.g. 10 (percent)
  snapshotBase:       string;   // 'subtotal' | 'grand_total'
  baseAmount:         number;   // the amount rate was applied to
  amount:             number;   // baseAmount * snapshotRate / 100
  status: typeof CommissionStatus[keyof typeof CommissionStatus];
  // Auto-approve window — when this passes, a BullMQ job can approve automatically
  eligibleForApprovalAt?: Date;
  approvedAt?:  Date;
  payableAt?:   Date;
  paidAt?:      Date;
  cancelledAt?: Date;
  reversedAt?:  Date;
  cancelledReason?: string;
  // Who performed the last status change
  actorId?:     mongoose.Types.ObjectId;
  metadata?:    Record<string, unknown>;
  createdAt:    Date;
  updatedAt:    Date;
}

const CommissionSchema = new Schema<ICommission>(
  {
    affiliateId:   { type: Schema.Types.ObjectId, ref: 'Affiliate', required: true, index: true },
    orderId:       { type: Schema.Types.ObjectId, ref: 'Order',     required: true, index: true },
    attributionId: { type: Schema.Types.ObjectId, ref: 'AffiliateAttribution' },
    snapshotRate:  { type: Number, required: true },
    snapshotBase:  { type: String, required: true },
    baseAmount:    { type: Number, required: true, min: 0 },
    amount:        { type: Number, required: true, min: 0 },
    status:        { type: String, enum: Object.values(CommissionStatus), default: CommissionStatus.PENDING, index: true },
    eligibleForApprovalAt: { type: Date },
    approvedAt:    { type: Date },
    payableAt:     { type: Date },
    paidAt:        { type: Date },
    cancelledAt:   { type: Date },
    reversedAt:    { type: Date },
    cancelledReason: { type: String },
    actorId:       { type: Schema.Types.ObjectId, ref: 'User' },
    metadata:      { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// One commission per order — idempotency guard
CommissionSchema.index({ orderId: 1 }, { unique: true });
CommissionSchema.index({ affiliateId: 1, status: 1, createdAt: -1 });

export const CommissionModel = mongoose.model<ICommission>(
  'Commission',
  CommissionSchema,
  'affiliate_commissions'
);
