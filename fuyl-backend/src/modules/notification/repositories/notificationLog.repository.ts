import { Types } from 'mongoose';
import { INotificationLog, NotificationLogModel, NotificationStatus } from '../models/notification.model';

export class NotificationLogRepository {
  async create(data: Partial<INotificationLog>): Promise<INotificationLog> {
    return NotificationLogModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<INotificationLog | null> {
    return NotificationLogModel.findById(id);
  }

  async updateStatus(
    id: string | Types.ObjectId,
    status: NotificationStatus,
    patch?: { providerMessageId?: string; error?: string; sentAt?: Date }
  ): Promise<INotificationLog | null> {
    return NotificationLogModel.findByIdAndUpdate(
      id,
      { $set: { status, ...patch } },
      { new: true }
    );
  }

  async incrementAttempts(id: string | Types.ObjectId): Promise<INotificationLog | null> {
    return NotificationLogModel.findByIdAndUpdate(
      id,
      { $inc: { attempts: 1 } },
      { new: true }
    );
  }

  async findByUser(userId: string | Types.ObjectId, limit = 50) {
    return NotificationLogModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async findFailed(limit = 100) {
    return NotificationLogModel
      .find({ status: 'failed', attempts: { $lt: 3 } })
      .sort({ createdAt: 1 })
      .limit(limit);
  }

  async paginate(filter: Record<string, unknown> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      NotificationLogModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      NotificationLogModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async stats() {
    const [byStatus, byChannel, total] = await Promise.all([
      NotificationLogModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      NotificationLogModel.aggregate([
        { $group: { _id: '$channel', count: { $sum: 1 } } },
      ]),
      NotificationLogModel.countDocuments({}),
    ]);
    return {
      total,
      byStatus: byStatus.reduce((acc: Record<string, number>, r: { _id: string; count: number }) => {
        acc[r._id] = r.count;
        return acc;
      }, {}),
      byChannel: byChannel.reduce((acc: Record<string, number>, r: { _id: string; count: number }) => {
        acc[r._id] = r.count;
        return acc;
      }, {}),
    };
  }
}
