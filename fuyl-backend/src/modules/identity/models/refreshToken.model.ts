import mongoose, { Schema, Document } from 'mongoose';

export interface IRefreshToken extends Document {
  tokenHash: string;          // sha256 of refresh token
  userId: mongoose.Types.ObjectId;
  userAgent?: string;
  ip?: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByTokenHash?: string;
  isRevoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    tokenHash: { type: String, required: true, unique: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    userAgent: { type: String },
    ip: { type: String },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date },
    replacedByTokenHash: { type: String },
    isRevoked: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

RefreshTokenSchema.index({ userId: 1, isRevoked: 1 });

export const RefreshTokenModel = mongoose.model<IRefreshToken>(
  'RefreshToken',
  RefreshTokenSchema,
  'refresh_tokens'
);
