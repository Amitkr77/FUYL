import mongoose, { Schema, Document } from 'mongoose';

export interface IRole extends Document {
  name: string;          // e.g. 'admin', 'seller', 'customer'
  label: string;         // human-readable
  description?: string;
  permissions: string[]; // e.g. ['catalog:read', 'order:write']
  isSystem: boolean;     // system roles cannot be deleted
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema = new Schema<IRole>(
  {
    name: { type: String, required: true, unique: true, lowercase: true, trim: true },
    label: { type: String, required: true },
    description: { type: String },
    permissions: [{ type: String }],
    isSystem: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const RoleModel = mongoose.model<IRole>('Role', RoleSchema, 'roles');
