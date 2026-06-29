import { FilterQuery, Types } from 'mongoose';
import { IUser, UserModel } from '../models/user.model';

export class UserRepository {
  async create(data: Partial<IUser>): Promise<IUser> {
    return UserModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<IUser | null> {
    return UserModel.findById(id);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ emailLower: email.toLowerCase().trim() });
  }

  async findByPhone(phone: string): Promise<IUser | null> {
    return UserModel.findOne({ phone });
  }

  async update(id: string | Types.ObjectId, patch: Partial<IUser>): Promise<IUser | null> {
    return UserModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true });
  }

  async updateByEmail(email: string, patch: Partial<IUser>): Promise<IUser | null> {
    return UserModel.findOneAndUpdate(
      { emailLower: email.toLowerCase().trim() },
      { $set: patch },
      { new: true }
    );
  }

  async softDelete(id: string | Types.ObjectId): Promise<void> {
    await UserModel.findByIdAndUpdate(id, { $set: { isDeleted: true, isActive: false } });
  }

  async incrementFailedLogin(email: string, lockDurationMinutes = 15): Promise<IUser | null> {
    const user = await UserModel.findOne({ emailLower: email.toLowerCase().trim() });
    if (!user) return null;
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= 5) {
      user.lockedUntil = new Date(Date.now() + lockDurationMinutes * 60 * 1000);
    }
    return user.save();
  }

  async resetFailedLogin(userId: string | Types.ObjectId): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, {
      $set: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  async paginate(filter: FilterQuery<IUser> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      UserModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      UserModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }
}
