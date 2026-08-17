import mongoose from 'mongoose';
import { LoyaltyConfigModel, ILoyaltyConfig } from '../models/loyaltyConfig.model';
import { LoyaltyAccountModel, ILoyaltyAccount } from '../models/loyaltyAccount.model';
import { LoyaltyTransactionModel, ILoyaltyTransaction } from '../models/loyaltyTransaction.model';

// ─── Config Repository ────────────────────────────────────────────────────────

export class LoyaltyConfigRepository {
  /** Return the single active config (most recently updated). */
  async findActive(): Promise<ILoyaltyConfig | null> {
    return LoyaltyConfigModel.findOne({ isActive: true }).sort({ updatedAt: -1 });
  }

  async create(data: Partial<ILoyaltyConfig>): Promise<ILoyaltyConfig> {
    return LoyaltyConfigModel.create(data);
  }

  async update(id: string, patch: Partial<ILoyaltyConfig>): Promise<ILoyaltyConfig | null> {
    return LoyaltyConfigModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true });
  }

  async findAll(): Promise<ILoyaltyConfig[]> {
    return LoyaltyConfigModel.find().sort({ updatedAt: -1 });
  }
}

// ─── Account Repository ───────────────────────────────────────────────────────

export class LoyaltyAccountRepository {
  /** Upsert an account for the given user, returning the document. */
  async findOrCreateByUser(userId: string): Promise<ILoyaltyAccount> {
    const account = await LoyaltyAccountModel.findOneAndUpdate(
      { userId: new mongoose.Types.ObjectId(userId) },
      { $setOnInsert: { userId: new mongoose.Types.ObjectId(userId), balance: 0, lifetimeEarned: 0, lifetimeRedeemed: 0 } },
      { new: true, upsert: true, runValidators: true }
    );
    return account!;
  }

  async findByUser(userId: string): Promise<ILoyaltyAccount | null> {
    return LoyaltyAccountModel.findOne({ userId: new mongoose.Types.ObjectId(userId) });
  }

  /**
   * Atomically apply a signed delta to the account balance.
   * - Positive delta: credits balance and increments lifetimeEarned.
   * - Negative delta: debits balance and increments lifetimeRedeemed.
   *   The debit is only applied when balance >= |delta| to prevent going below 0.
   * Returns null when the debit guard prevents the update.
   */
  async applyDelta(accountId: string, delta: number): Promise<ILoyaltyAccount | null> {
    const absDelta = Math.abs(delta);

    if (delta > 0) {
      return LoyaltyAccountModel.findByIdAndUpdate(
        accountId,
        { $inc: { balance: delta, lifetimeEarned: delta } },
        { new: true }
      );
    }

    if (delta < 0) {
      // Guard: only update when balance is sufficient
      return LoyaltyAccountModel.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(accountId), balance: { $gte: absDelta } },
        { $inc: { balance: delta, lifetimeRedeemed: absDelta } },
        { new: true }
      );
    }

    // delta === 0 — no-op
    return LoyaltyAccountModel.findById(accountId);
  }
}

// ─── Transaction Repository ───────────────────────────────────────────────────

export class LoyaltyTransactionRepository {
  async create(data: Partial<ILoyaltyTransaction>): Promise<ILoyaltyTransaction> {
    return LoyaltyTransactionModel.create(data);
  }

  async findByUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      LoyaltyTransactionModel.find({ userId: new mongoose.Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      LoyaltyTransactionModel.countDocuments({ userId: new mongoose.Types.ObjectId(userId) }),
    ]);
    return { items, total, page, limit };
  }

  async findByReference(referenceType: string, referenceId: string): Promise<ILoyaltyTransaction[]> {
    return LoyaltyTransactionModel.find({
      referenceType,
      referenceId: new mongoose.Types.ObjectId(referenceId),
    });
  }

  async markReversed(txId: string, reversedTxId: string): Promise<void> {
    await LoyaltyTransactionModel.findByIdAndUpdate(txId, {
      $set: { isReversed: true, reversedTxId: new mongoose.Types.ObjectId(reversedTxId) },
    });
  }
}
