import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  actorId?: mongoose.Types.ObjectId;
  actorEmail: string;
  actorName: string;
  section: string;   // 'orders' | 'products' | 'inventory' | 'team' | 'customers' | 'settings' | ...
  action: string;    // 'created' | 'updated' | 'deleted' | 'status_changed' | 'activated' | 'deactivated' | ...
  targetId?: string;
  targetLabel?: string;
  detail?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId:     { type: Schema.Types.ObjectId, ref: 'User', index: true },
    actorEmail:  { type: String, required: true },
    actorName:   { type: String, default: '' },
    section:     { type: String, required: true, index: true },
    action:      { type: String, required: true },
    targetId:    { type: String },
    targetLabel: { type: String },
    detail:      { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// TTL: auto-delete logs older than 180 days
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

export const AuditLogModel = mongoose.models.AuditLog as mongoose.Model<IAuditLog>
  ?? mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);
