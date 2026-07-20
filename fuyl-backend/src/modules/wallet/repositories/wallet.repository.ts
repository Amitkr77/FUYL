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
   *
   * BUG FIXED (found via live testing): the previous version built the
   * update object as `{ $inc: { [field]: delta }, ...(cond ? { $inc: {...} } : {}) }`.
   * When `field === 'balance'`, that object literal specifies the `$inc`
   * key TWICE — JS object-literal/spread semantics silently keep only the
   * LAST occurrence, so `{ [field]: delta }` was discarded entirely and
   * only `totalLifetimeCredit`/`totalLifetimeDebit` were ever incremented.
   * The wallet's actual spendable `balance` never changed on any
   * credit/debit/hold/release — confirmed live: admin-credited ₹500,
   * balance stayed 0. Fixed by building one merged $inc object.
   */
  async applyDelta(
    walletId: string | Types.ObjectId,
    delta: number,
    field: 'balance' | 'pendingBalance' | 'heldBalance' = 'balance'
  ): Promise<IWallet | null> {
    const inc: Record<string, number> = { [field]: delta };
    if (field === 'balance') {
      if (delta >= 0) inc.totalLifetimeCredit = delta;
      else inc.totalLifetimeDebit = Math.abs(delta);
    }

    if (delta >= 0) {
      return WalletModel.findByIdAndUpdate(walletId, { $inc: inc }, { new: true });
    }
    // Negative delta — must have sufficient balance in that field
    const absDelta = Math.abs(delta);
    return WalletModel.findOneAndUpdate(
      { _id: walletId, [field]: { $gte: absDelta } },
      { $inc: inc },
      { new: true }
    );
  }

  /**
   * Move an amount from balance into heldBalance (or back) in a single
   * atomic write. wallet.service.ts's hold()/releaseHold() previously did
   * this as two separate applyDelta() calls — a crash between them could
   * desync balance vs heldBalance. One $inc on both fields together is
   * atomic at the MongoDB document level.
   */
  async moveToHeld(walletId: string | Types.ObjectId, amount: number): Promise<IWallet | null> {
    return WalletModel.findOneAndUpdate(
      { _id: walletId, balance: { $gte: amount } },
      { $inc: { balance: -amount, heldBalance: amount } },
      { new: true }
    );
  }

  async releaseFromHeld(walletId: string | Types.ObjectId, amount: number): Promise<IWallet | null> {
    return WalletModel.findOneAndUpdate(
      { _id: walletId, heldBalance: { $gte: amount } },
      { $inc: { balance: amount, heldBalance: -amount } },
      { new: true }
    );
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

  /**
   * Atomically flip a transaction to reversed, only if it isn't already.
   * Returns the doc if THIS call won the claim, null if it was already reversed
   * — so reverse() can't debit the wallet twice for one credit under concurrent
   * or duplicate reversal requests.
   */
  async claimForReversal(id: string | Types.ObjectId) {
    const { WalletTransactionModel } = await import('../models/transaction.model');
    return WalletTransactionModel.findOneAndUpdate(
      { _id: id, isReversed: { $ne: true } },
      { $set: { isReversed: true } },
      { new: true }
    );
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
