import mongoose, { Schema, Document } from 'mongoose';

export interface IPermission extends Document {
  name: string;          // e.g. 'catalog:read'
  label: string;
  description?: string;
  module: string;        // e.g. 'catalog', 'order'
  action: string;        // 'read' | 'write' | 'delete' | 'admin'
  createdAt: Date;
  updatedAt: Date;
}

const PermissionSchema = new Schema<IPermission>(
  {
    name: { type: String, required: true, unique: true, trim: true, index: true },
    label: { type: String, required: true },
    description: { type: String },
    module: { type: String, required: true, index: true },
    action: { type: String, required: true, enum: ['read', 'write', 'delete', 'admin'] },
  },
  { timestamps: true }
);

export const PermissionModel = mongoose.model<IPermission>('Permission', PermissionSchema, 'permissions');
