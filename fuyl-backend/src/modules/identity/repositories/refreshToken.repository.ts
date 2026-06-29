import { Types } from 'mongoose';
import { IRefreshToken, RefreshTokenModel } from '../models/refreshToken.model';

export class RefreshTokenRepository {
  async create(data: Partial<IRefreshToken>): Promise<IRefreshToken> {
    return RefreshTokenModel.create(data);
  }

  async findByTokenHash(tokenHash: string): Promise<IRefreshToken | null> {
    return RefreshTokenModel.findOne({ tokenHash, isRevoked: false });
  }

  async revoke(tokenHash: string, replacedBy?: string): Promise<void> {
    await RefreshTokenModel.updateOne(
      { tokenHash },
      { $set: { isRevoked: true, revokedAt: new Date(), replacedByTokenHash: replacedBy } }
    );
  }

  async revokeAllForUser(userId: string | Types.ObjectId): Promise<void> {
    await RefreshTokenModel.updateMany(
      { userId, isRevoked: false },
      { $set: { isRevoked: true, revokedAt: new Date() } }
    );
  }

  async cleanupExpired(): Promise<number> {
    const res = await RefreshTokenModel.deleteMany({ expiresAt: { $lt: new Date() } });
    return res.deletedCount;
  }

  async listActiveForUser(userId: string | Types.ObjectId) {
    return RefreshTokenModel.find({ userId, isRevoked: false }).sort({ createdAt: -1 });
  }
}
