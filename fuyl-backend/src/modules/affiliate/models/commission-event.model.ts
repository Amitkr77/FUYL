import mongoose, { Schema, Document } from 'mongoose';
import { CommissionEventType } from '../../../shared/enums';

// Immutable audit ledger — never update, only append.
export interface ICommissionEvent extends Document {
  commissionId: mongoose.Types.ObjectId;
  affiliateId:  mongoose.Types.ObjectId;
  eventType:    typeof CommissionEventType[keyof typeof CommissionEventType];
  amountDelta:  number; // +amount on creation, -amount on reversal/cancellation
  actorId?:     mongoose.Types.ObjectId; // admin user who triggered the event
  note?:        string;
  createdAt:    Date;
  updatedAt:    Date;
}

const CommissionEventSchema = new Schema<ICommissionEvent>(
  {
    commissionId: { type: Schema.Types.ObjectId, ref: 'Commission', required: true, index: true },
    affiliateId:  { type: Schema.Types.ObjectId, ref: 'Affiliate',  required: true, index: true },
    eventType:    { type: String, enum: Object.values(CommissionEventType), required: true },
    amountDelta:  { type: Number, required: true },
    actorId:      { type: Schema.Types.ObjectId, ref: 'User' },
    note:         { type: String },
  },
  { timestamps: true }
);

export const CommissionEventModel = mongoose.model<ICommissionEvent>(
  'CommissionEvent',
  CommissionEventSchema,
  'affiliate_commission_events'
);
