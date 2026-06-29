import { FilterQuery, Types } from 'mongoose';
import { IWallet, WalletModel } from '../models/wallet.model';
import { IWalletTransaction } from '../models/transaction.model';

export class WalletRepository {
  async findOrCreateByUser(userId: string | Types.ObjectId): Promise<IWallet> {
    const uid = new Types.ObjectId(userId);
    const existing = await WalletModel.findOne({ userId: uid });
    if (existing) return existing;
    return WalletModel.create({ userId: uid, balance: 0, currency: 'INR' });
  }

  async findByUser(userId: string | Types.ObjectId): Promise<IWallet | null> {
    return WalletModel.findOne({ userId: new Types.ObjectId(userId) });
  }

  async findById(id: string | Types.ObjectId): Promise<IWallet | null> {
    return WalletModel.findById(id);
  }

  async update(id: string | Types.ObjectId, patch: Partial<IWallet>): Promise<IWallet | null> {
    return WalletModel.findByIdAndUpdate(id, { $set: patch }, { new: true });
  }

  /**
   * Atomically apply a credit/debit to the wallet.
   * Returns the updated wallet or null if insufficient balance.
   */
  async applyDelta(
    walletId: string | Types.ObjectId,
    delta: number,
    field: 'balance' | 'pendingBalance' | 'heldBalance' = 'balance'
  ): Promise<IWallet | null> {
    if (delta >= 0) {
      return WalletModel.findByIdAndUpdate(
        walletId,
        {
          $inc: { [field]: delta },
          ...(field === 'balance' ? { $inc: { totalLifetimeCredit: delta } } : {}),
        },
        { new: true }
      );
    }
    // Negative delta — must have sufficient balance
    const absDelta = Math.abs(delta);
    const updated = await WalletModel.findOneAndUpdate(
      { _id: walletId, [field]: { $gte: absDelta } },
      {
        $inc: { [field]: -absDelta },
        ...(field === 'balance' ? { $inc: { totalLifetimeDebit: absDelta } } : {}),
      },
      { new: true }
    );
    return updated;
  }
}

export class WalletTransactionRepository {
  async create(data: Partial<IWalletTransaction>): Promise<IWalletTransaction> {
    return (await import('../models/transaction.model')).WalletTransactionModel.create(data);
  }

  async findById(id: string | Types.ObjectId) {
    const { WalletTransactionModel } = await import('../models/transaction.model');
    return WalletTransactionModel.findById(id);
  }

  async findByWallet(walletId: string | Types.ObjectId, limit = 50) {
    const { WalletTransactionModel } = await import('../models/transaction.model');
    return WalletTransactionModel.find({ walletId }).sort({ createdAt: -1 }).limit(limit);
  }

  async findByUser(userId: string | Types.ObjectId, filter: FilterQuery<IWalletTransaction> = {}, limit = 50) {
    const { WalletTransactionModel } = await import('../models/transaction.model');
    return WalletTransactionModel
      .find({ userId: new Types.ObjectId(userId), ...filter })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async findByReference(referenceType: string, referenceId: string | Types.ObjectId) {
    const { WalletTransactionModel } = await import('../models/transaction.model');
    return WalletTransactionModel.find({ referenceType, referenceId: new Types.ObjectId(referenceId) });
  }

  async markReversed(id: string | Types.ObjectId, reversedByTxId: string | Types.ObjectId) {
    const { WalletTransactionModel } = await import('../models/transaction.model');
    return WalletTransactionModel.findByIdAndUpdate(
      id,
      { $set: { isReversed: true, reversedByTxId: new Types.ObjectId(reversedByTxId) } },
      { new: true }
    );
  }

  async paginate(filter: FilterQuery<IWalletTransaction> = {}, page = 1, limit = 20) {
    const { WalletTransactionModel } = await import('../models/transaction.model');
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      WalletTransactionModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      WalletTransactionModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }
}
