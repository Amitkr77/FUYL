import mongoose, { Types } from 'mongoose';
import { LoyaltyAccountModel, LoyaltyTransactionModel, type ILoyaltyTransaction } from '../models';

type PointLot = { tx: ILoyaltyTransaction; remaining: number };

export class LoyaltyExpiryService {
  async sweep(now = new Date(), userLimit = 500): Promise<{ users: number; points: number }> {
    const dueUsers = await LoyaltyTransactionModel.aggregate<{ _id: Types.ObjectId }>([
      { $match: { type: 'earn', expiresAt: { $lte: now }, expiredAt: { $exists: false } } },
      { $group: { _id: '$userId' } },
      { $limit: userLimit },
    ]);
    let points = 0;
    for (const { _id } of dueUsers) points += await this.expireUser(_id, now);
    return { users: dueUsers.length, points };
  }

  private async expireUser(userId: Types.ObjectId, now: Date): Promise<number> {
    const session = await mongoose.startSession();
    let expiredTotal = 0;
    try {
      await session.withTransaction(async () => {
        const [account, transactions] = await Promise.all([
          LoyaltyAccountModel.findOne({ userId }).session(session),
          LoyaltyTransactionModel.find({ userId }).sort({ createdAt: 1, _id: 1 }).session(session),
        ]);
        if (!account) return;

        // Replay all positive and negative ledger entries to allocate spending
        // FIFO. This is backward-compatible with earn rows created before lot
        // tracking existed and prevents already-spent points expiring again.
        const lots: PointLot[] = [];
        for (const tx of transactions) {
          if (tx.points > 0) {
            lots.push({ tx, remaining: tx.points });
            continue;
          }
          let debit = Math.abs(tx.points);
          for (const lot of lots) {
            if (debit === 0) break;
            const consumed = Math.min(lot.remaining, debit);
            lot.remaining -= consumed;
            debit -= consumed;
          }
        }

        const dueLots = lots.filter(({ tx }) =>
          tx.type === 'earn' && Boolean(tx.expiresAt && tx.expiresAt <= now) && !tx.expiredAt
        );
        if (dueLots.length === 0) return;

        let available = account.balance;
        const expirations = dueLots.map((lot) => {
          const points = Math.min(lot.remaining, available);
          available -= points;
          return { lot, points };
        });
        const total = expirations.reduce((sum, row) => sum + row.points, 0);

        if (total > 0) {
          const changed = await LoyaltyAccountModel.updateOne(
            { _id: account._id, balance: { $gte: total } },
            { $inc: { balance: -total } },
            { session }
          );
          if (changed.modifiedCount !== 1) throw new Error(`Concurrent loyalty balance change for ${userId}`);
        }

        let runningBalance = account.balance;
        for (const { lot, points } of expirations) {
          const claimed = await LoyaltyTransactionModel.updateOne(
            { _id: lot.tx._id, expiredAt: { $exists: false } },
            { $set: { expiredAt: now, expiredPoints: points } },
            { session }
          );
          if (claimed.modifiedCount !== 1) throw new Error(`Earn lot ${lot.tx.id} was already processed`);
          if (points <= 0) continue;
          await LoyaltyTransactionModel.create([{
            userId,
            type: 'expire',
            points: -points,
            balanceBefore: runningBalance,
            balanceAfter: runningBalance - points,
            referenceType: 'expiry',
            referenceId: lot.tx._id,
            description: `Expired ${points} unused loyalty points`,
            isReversed: false,
          }], { session });
          runningBalance -= points;
        }
        expiredTotal = total;
      });
    } finally {
      await session.endSession();
    }
    return expiredTotal;
  }
}

export const loyaltyExpiryService = new LoyaltyExpiryService();
