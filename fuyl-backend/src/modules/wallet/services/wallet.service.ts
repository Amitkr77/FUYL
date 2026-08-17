import { WalletRepository, WalletTransactionRepository } from '../repositories/wallet.repository';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../../../shared/errors';
import { WalletTxType, WalletTxSource } from '../models/transaction.model';
import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { logger } from '../../../config/logger';
import mongoose, { Types } from 'mongoose';
import { WalletModel } from '../models/wallet.model';
import { WalletTransactionModel } from '../models/transaction.model';
import { fromPaise, toPaise } from '../../../shared/utils';

const walletRepo = new WalletRepository();
const txRepo = new WalletTransactionRepository();

export interface CreditInput {
  userId: string | Types.ObjectId;
  amount: number;
  source: WalletTxSource;
  description: string;
  referenceType?: string;
  referenceId?: string | Types.ObjectId;
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface DebitInput extends Omit<CreditInput, 'amount'> {
  amount: number;
}

export class WalletService {
  private normalizeAmount(amount: number) {
    return fromPaise(toPaise(amount));
  }

  private transactionKey(action: string, input: CreditInput) {
    if (!input.referenceType || !input.referenceId) return undefined;
    return `${action}:${input.source}:${input.referenceType}:${input.referenceId.toString()}`;
  }

  async getOrCreateWallet(userId: string | Types.ObjectId) {
    return walletRepo.findOrCreateByUser(userId);
  }

  async getBalance(userId: string | Types.ObjectId) {
    const w = await this.getOrCreateWallet(userId);
    return {
      balance: w.balance,
      pendingBalance: w.pendingBalance,
      heldBalance: w.heldBalance,
      loyaltyPoints: w.loyaltyPoints,
      currency: w.currency,
      isFrozen: w.isFrozen,
    };
  }

  async getTransactions(userId: string | Types.ObjectId, limit = 50) {
    const transactions = await txRepo.findByUser(userId, {}, limit);
    return this.enrichTransactions(transactions);
  }

  async getTransactionsPage(userId: string | Types.ObjectId, page = 1, limit = 20) {
    const result = await txRepo.paginate(
      { userId: new Types.ObjectId(userId.toString()) },
      page,
      limit
    );
    return { ...result, items: await this.enrichTransactions(result.items) };
  }

  private async enrichTransactions(transactions: any[]) {
    const reversalIds = transactions
      .map((tx) => (tx.metadata as any)?.originalTxId)
      .filter(Boolean);
    const originals = await Promise.all(reversalIds.map((id) => txRepo.findById(id)));
    const originalOrderById = new Map(
      originals.filter(Boolean).map((tx) => [tx!._id.toString(), (tx!.metadata as any)?.orderId])
    );
    const orderIds = transactions.map((tx) =>
      (tx.metadata as any)?.orderId ?? originalOrderById.get(String((tx.metadata as any)?.originalTxId))
    ).filter(Boolean);
    const { OrderModel } = await import('../../order/models/order.model');
    const orders = await OrderModel.find({ _id: { $in: orderIds } }).select('orderNumber').lean();
    const orderNumbers = new Map(orders.map((order) => [order._id.toString(), order.orderNumber]));

    return transactions.map((tx) => {
      const raw = tx.toObject();
      const orderId = (tx.metadata as any)?.orderId ?? originalOrderById.get(String((tx.metadata as any)?.originalTxId));
      const orderNumber = orderNumbers.get(String(orderId));
      return orderNumber
        ? { ...raw, description: raw.description.replace(/[0-9a-f]{24}/gi, orderNumber), orderNumber }
        : raw;
    });
  }

  async credit(input: CreditInput) {
    return this.mutateBalance(input, 'credit');
  }

  async debit(input: DebitInput) {
    return this.mutateBalance(input, 'debit');
  }

  private async mutateBalance(input: CreditInput, type: 'credit' | 'debit') {
    const amount = this.normalizeAmount(input.amount);
    if (amount <= 0) throw new BadRequestError(`${type === 'credit' ? 'Credit' : 'Debit'} amount must be positive`);
    const key = this.transactionKey(type, input);
    const session = await mongoose.startSession();
    try {
      let result: any;
      await session.withTransaction(async () => {
        if (key) {
          const duplicate = await WalletTransactionModel.findOne({ idempotencyKey: key }).session(session);
          if (duplicate) {
            result = { wallet: await WalletModel.findById(duplicate.walletId).session(session), transaction: duplicate };
            return;
          }
        }

        const delta = type === 'credit' ? amount : -amount;
        const userId = new Types.ObjectId(input.userId.toString());
        let currentWallet = await WalletModel.findOne({ userId }).session(session);
        if (!currentWallet && type === 'credit') {
          [currentWallet] = await WalletModel.create([{ userId, balance: 0, currency: 'INR' }], { session });
        }
        if (!currentWallet) throw new BadRequestError('Insufficient wallet balance');
        if (currentWallet.isFrozen) throw new ForbiddenError('Wallet is frozen');
        const filter: Record<string, unknown> = { _id: currentWallet._id };
        if (type === 'debit') filter.balance = { $gte: amount };
        const update = type === 'credit'
          ? { $inc: { balance: delta, totalLifetimeCredit: amount } }
          : { $inc: { balance: delta, totalLifetimeDebit: amount } };
        const wallet = await WalletModel.findOneAndUpdate(filter, update, {
          new: true,
          session,
        });
        if (!wallet) throw new BadRequestError('Insufficient wallet balance or wallet is frozen');

        const balanceBefore = this.normalizeAmount(wallet.balance - delta);
        const [transaction] = await WalletTransactionModel.create([{
          walletId: wallet._id,
          userId: wallet.userId,
          type: type as WalletTxType,
          source: input.source,
          amount,
          currency: wallet.currency,
          balanceBefore,
          balanceAfter: this.normalizeAmount(wallet.balance),
          referenceType: input.referenceType,
          referenceId: input.referenceId ? new Types.ObjectId(input.referenceId.toString()) : undefined,
          idempotencyKey: key,
          description: input.description,
          expiresAt: input.expiresAt,
          isReversed: false,
          metadata: input.metadata,
        }], { session });
        result = { wallet, transaction };
      });
      logger.info(`[wallet] ${type}ed ₹${amount} for user ${input.userId} (source: ${input.source})`);
      return result;
    } catch (error: any) {
      if (key && error?.code === 11000) {
        const transaction = await WalletTransactionModel.findOne({ idempotencyKey: key });
        if (transaction) return { wallet: await WalletModel.findById(transaction.walletId), transaction };
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private async creditLegacy(input: CreditInput) {
    if (input.amount <= 0) throw new BadRequestError('Credit amount must be positive');

    // Idempotency: a reference-bound credit (referral reward, refund, reversal)
    // must apply at most once even if its triggering event is redelivered
    // (BullMQ is at-least-once). If a matching credit already exists, no-op.
    if (input.referenceType && input.referenceId) {
      try {
        const existing = await txRepo.findByReference(input.referenceType, input.referenceId);
        const dup = existing.find((t) => t.type === 'credit' && t.source === input.source);
        if (dup) {
          logger.warn(`[wallet] duplicate credit skipped (source=${input.source}, ref=${input.referenceType}:${input.referenceId})`);
          return { wallet: await this.getOrCreateWallet(input.userId), transaction: dup };
        }
      } catch {
        // Non-ObjectId reference or lookup failure — proceed without dedup
        // rather than blocking a legitimate credit.
      }
    }

    const wallet = await this.getOrCreateWallet(input.userId);
    if (wallet.isFrozen) throw new ForbiddenError('Wallet is frozen');

    const balanceBefore = wallet.balance;
    const updated = await walletRepo.applyDelta(wallet._id, input.amount, 'balance');
    if (!updated) throw new Error('Failed to credit wallet');

    const tx = await txRepo.create({
      walletId: updated._id,
      userId: updated.userId,
      type: 'credit' as WalletTxType,
      source: input.source,
      amount: input.amount,
      currency: updated.currency,
      balanceBefore,
      balanceAfter: updated.balance,
      referenceType: input.referenceType,
      referenceId: input.referenceId ? new Types.ObjectId(input.referenceId.toString()) : undefined,
      description: input.description,
      expiresAt: input.expiresAt,
      isReversed: false,
      metadata: input.metadata,
    });

    logger.info(`[wallet] credited ₹${input.amount} to user ${input.userId} (source: ${input.source})`);
    return { wallet: updated, transaction: tx };
  }

  private async debitLegacy(input: DebitInput) {
    if (input.amount <= 0) throw new BadRequestError('Debit amount must be positive');
    const wallet = await this.getOrCreateWallet(input.userId);
    if (wallet.isFrozen) throw new ForbiddenError('Wallet is frozen');
    if (wallet.balance < input.amount) throw new BadRequestError('Insufficient wallet balance');

    const balanceBefore = wallet.balance;
    const updated = await walletRepo.applyDelta(wallet._id, -input.amount, 'balance');
    if (!updated) throw new BadRequestError('Insufficient wallet balance');

    const tx = await txRepo.create({
      walletId: updated._id,
      userId: updated.userId,
      type: 'debit' as WalletTxType,
      source: input.source,
      amount: input.amount,
      currency: updated.currency,
      balanceBefore,
      balanceAfter: updated.balance,
      referenceType: input.referenceType,
      referenceId: input.referenceId ? new Types.ObjectId(input.referenceId.toString()) : undefined,
      description: input.description,
      isReversed: false,
      metadata: input.metadata,
    });

    logger.info(`[wallet] debited ₹${input.amount} from user ${input.userId} (source: ${input.source})`);
    return { wallet: updated, transaction: tx };
  }

  /**
   * Reverse a previously-credited transaction (e.g. referral reward when referee's order is cancelled).
   * Only credits can be reversed. If wallet balance < amount, the reversal is recorded but balance goes negative-safe
   * (we cap at 0 and log a warning).
   */
  async reverse(transactionId: string | Types.ObjectId, reason: string): Promise<void> {
    const original = await WalletTransactionModel.findById(transactionId);
    if (!original) throw new NotFoundError('Wallet transaction');
    if (original.type !== 'credit') throw new BadRequestError('Only credit transactions can be reversed');

    let displayReason = reason;
    const relatedOrderId = (original.metadata as any)?.orderId;
    if (relatedOrderId) {
      const { OrderModel } = await import('../../order/models/order.model');
      const order = await OrderModel.findById(relatedOrderId).select('orderNumber').lean();
      if (order?.orderNumber) displayReason = reason.replace(String(relatedOrderId), order.orderNumber);
    }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const claimed = await WalletTransactionModel.findOneAndUpdate(
          { _id: original._id, type: 'credit', isReversed: { $ne: true } },
          { $set: { isReversed: true } },
          { new: true, session }
        );
        if (!claimed) throw new ConflictError('Transaction already reversed');

        const walletBefore = await WalletModel.findById(claimed.walletId).session(session);
        if (!walletBefore) throw new NotFoundError('Wallet');
        const requestedAmount = this.normalizeAmount(claimed.amount);
        const debitAmount = Math.min(this.normalizeAmount(walletBefore.balance), requestedAmount);
        const wallet = await WalletModel.findOneAndUpdate(
          { _id: walletBefore._id, balance: { $gte: debitAmount } },
          { $inc: { balance: -debitAmount, totalLifetimeDebit: debitAmount } },
          { new: true, session }
        );
        if (!wallet) throw new Error('Failed to reverse wallet transaction');

        const [reversal] = await WalletTransactionModel.create([{
          walletId: wallet._id,
          userId: wallet.userId,
          type: 'reverse' as WalletTxType,
          source: 'reversal' as WalletTxSource,
          amount: debitAmount,
          currency: wallet.currency,
          balanceBefore: this.normalizeAmount(walletBefore.balance),
          balanceAfter: this.normalizeAmount(wallet.balance),
          referenceType: 'wallet_transaction',
          referenceId: claimed._id,
          idempotencyKey: `reverse:reversal:wallet_transaction:${claimed._id}`,
          description: `Reversal: ${displayReason}`,
          isReversed: false,
          metadata: {
            originalTxId: claimed._id,
            reason: displayReason,
            orderId: relatedOrderId,
            requestedAmount,
            uncollectedAmount: this.normalizeAmount(requestedAmount - debitAmount),
          },
        }], { session });
        claimed.reversedByTxId = reversal._id;
        await claimed.save({ session });
      });
      logger.info(`[wallet] reversed tx ${original._id} (${displayReason})`);
    } finally {
      await session.endSession();
    }
  }

  private async reverseLegacy(transactionId: string | Types.ObjectId, reason: string): Promise<void> {
    const original = await txRepo.findById(transactionId);
    if (!original) throw new NotFoundError('Wallet transaction');
    if (original.type !== 'credit') throw new BadRequestError('Only credit transactions can be reversed');

    // Atomic claim replaces the previous read-then-check on isReversed: only the
    // caller that wins this flip proceeds, so concurrent/duplicate reversals
    // can't debit the wallet twice for a single credit.
    const claimed = await txRepo.claimForReversal(original._id);
    if (!claimed) throw new ConflictError('Transaction already reversed');

    // Reverse debit (debit the wallet back)
    const wallet = await walletRepo.findById(original.walletId);
    if (!wallet) throw new NotFoundError('Wallet');

    const balanceBefore = wallet.balance;
    let updated;
    if (wallet.balance >= original.amount) {
      updated = await walletRepo.applyDelta(wallet._id, -original.amount, 'balance');
    } else {
      // Cap at 0 — wallet can't go negative
      const delta = -wallet.balance;
      updated = await walletRepo.applyDelta(wallet._id, delta, 'balance');
      logger.warn(`[wallet] capped reversal at 0 for tx ${transactionId} (would have gone negative)`);
    }
    if (!updated) throw new Error('Failed to reverse wallet transaction');

    let displayReason = reason;
    const relatedOrderId = (original.metadata as any)?.orderId;
    if (relatedOrderId) {
      const { OrderModel } = await import('../../order/models/order.model');
      const relatedOrder = await OrderModel.findById(relatedOrderId).select('orderNumber').lean();
      if (relatedOrder?.orderNumber) {
        displayReason = reason.replace(String(relatedOrderId), relatedOrder.orderNumber);
      }
    }

    const reversalTx = await txRepo.create({
      walletId: updated._id,
      userId: updated.userId,
      type: 'reverse' as WalletTxType,
      source: 'reversal' as WalletTxSource,
      amount: original.amount,
      currency: updated.currency,
      balanceBefore,
      balanceAfter: updated.balance,
      referenceType: 'wallet_transaction',
      referenceId: original._id,
      description: `Reversal: ${displayReason}`,
      isReversed: false,
      metadata: { originalTxId: original._id, reason: displayReason, orderId: relatedOrderId },
    });

    await txRepo.markReversed(original._id, reversalTx._id);
    logger.info(`[wallet] reversed tx ${original._id} — ₹${original.amount} (${reason})`);
  }

  /**
   * Hold funds for an in-progress order. Held funds are deducted from balance and
   * released when the order completes (→ debit + tx) or cancelled (→ release back to balance).
   */
  async hold(userId: string | Types.ObjectId, amount: number, referenceType: string, referenceId: string, description: string) {
    const normalizedAmount = this.normalizeAmount(amount);
    if (normalizedAmount <= 0) throw new BadRequestError('Hold amount must be positive');
    const idempotencyKey = `hold:order_payment:${referenceType}:${referenceId}`;
    const session = await mongoose.startSession();
    try {
      let result: any;
      await session.withTransaction(async () => {
        const duplicate = await WalletTransactionModel.findOne({ idempotencyKey }).session(session);
        if (duplicate) {
          result = { wallet: await WalletModel.findById(duplicate.walletId).session(session), transaction: duplicate };
          return;
        }
        const wallet = await WalletModel.findOneAndUpdate(
          {
            userId: new Types.ObjectId(userId.toString()),
            isFrozen: { $ne: true },
            balance: { $gte: normalizedAmount },
          },
          { $inc: { balance: -normalizedAmount, heldBalance: normalizedAmount } },
          { new: true, session }
        );
        if (!wallet) throw new BadRequestError('Insufficient wallet balance or wallet is frozen');
        const balanceBefore = this.normalizeAmount(wallet.balance + normalizedAmount);
        const [transaction] = await WalletTransactionModel.create([{
          walletId: wallet._id,
          userId: wallet.userId,
          type: 'hold' as WalletTxType,
          source: 'order_payment' as WalletTxSource,
          amount: normalizedAmount,
          currency: wallet.currency,
          balanceBefore,
          balanceAfter: this.normalizeAmount(wallet.balance),
          referenceType,
          referenceId: new Types.ObjectId(referenceId),
          idempotencyKey,
          description,
          isReversed: false,
        }], { session });
        result = { wallet, transaction };
      });
      return result;
    } catch (error: any) {
      if (error?.code === 11000) {
        const transaction = await WalletTransactionModel.findOne({ idempotencyKey });
        if (transaction) return { wallet: await WalletModel.findById(transaction.walletId), transaction };
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private async holdLegacy(userId: string | Types.ObjectId, amount: number, referenceType: string, referenceId: string, description: string) {
    if (amount <= 0) throw new BadRequestError('Hold amount must be positive');
    const wallet = await this.getOrCreateWallet(userId);
    if (wallet.isFrozen) throw new ForbiddenError('Wallet is frozen');
    if (wallet.balance < amount) throw new BadRequestError('Insufficient wallet balance');

    const balanceBefore = wallet.balance;
    // Single atomic write moving balance -> heldBalance together, instead
    // of two separate applyDelta() calls that could desync under a crash.
    const updated2 = await walletRepo.moveToHeld(wallet._id, amount);
    if (!updated2) throw new BadRequestError('Insufficient wallet balance');

    const tx = await txRepo.create({
      walletId: updated2._id,
      userId: updated2.userId,
      type: 'hold' as WalletTxType,
      source: 'order_payment' as WalletTxSource,
      amount,
      currency: updated2.currency,
      balanceBefore,
      balanceAfter: updated2.balance,
      referenceType,
      referenceId: new Types.ObjectId(referenceId),
      description,
      isReversed: false,
    });

    return { wallet: updated2, transaction: tx };
  }

  async releaseHold(transactionId: string | Types.ObjectId, reason: string) {
    const idempotencyKey = `release:order_refund:wallet_transaction:${transactionId}`;
    const session = await mongoose.startSession();
    try {
      let result: any;
      await session.withTransaction(async () => {
        const duplicate = await WalletTransactionModel.findOne({ idempotencyKey }).session(session);
        if (duplicate) {
          result = { wallet: await WalletModel.findById(duplicate.walletId).session(session), transaction: duplicate };
          return;
        }
        const original = await WalletTransactionModel.findOneAndUpdate(
          { _id: transactionId, type: 'hold', isReversed: { $ne: true } },
          { $set: { isReversed: true } },
          { new: true, session }
        );
        if (!original) throw new ConflictError('Hold transaction already released or not found');
        const normalizedAmount = this.normalizeAmount(original.amount);
        const walletBefore = await WalletModel.findById(original.walletId).session(session);
        if (!walletBefore) throw new NotFoundError('Wallet');
        const wallet = await WalletModel.findOneAndUpdate(
          { _id: original.walletId, heldBalance: { $gte: normalizedAmount } },
          { $inc: { balance: normalizedAmount, heldBalance: -normalizedAmount } },
          { new: true, session }
        );
        if (!wallet) throw new Error('Failed to release hold — held balance lower than expected');
        const [release] = await WalletTransactionModel.create([{
          walletId: wallet._id,
          userId: wallet.userId,
          type: 'release' as WalletTxType,
          source: 'order_refund' as WalletTxSource,
          amount: normalizedAmount,
          currency: wallet.currency,
          balanceBefore: this.normalizeAmount(walletBefore.balance),
          balanceAfter: this.normalizeAmount(wallet.balance),
          referenceType: 'wallet_transaction',
          referenceId: original._id,
          idempotencyKey,
          description: `Release: ${reason}`,
          isReversed: false,
        }], { session });
        original.reversedByTxId = release._id;
        await original.save({ session });
        result = { wallet, transaction: release };
      });
      return result;
    } catch (error: any) {
      if (error?.code === 11000) {
        const transaction = await WalletTransactionModel.findOne({ idempotencyKey });
        if (transaction) return { wallet: await WalletModel.findById(transaction.walletId), transaction };
      }
      throw error;
    } finally {
      await session.endSession();
    }
  }

  private async releaseHoldLegacy(transactionId: string | Types.ObjectId, reason: string) {
    const original = await txRepo.findById(transactionId);
    if (!original) throw new NotFoundError('Wallet transaction');
    if (original.type !== 'hold') throw new BadRequestError('Only hold transactions can be released');

    const wallet = await walletRepo.findById(original.walletId);
    if (!wallet) throw new NotFoundError('Wallet');

    const balanceBefore = wallet.balance;
    // Single atomic write moving heldBalance -> balance together.
    const updated2 = await walletRepo.releaseFromHeld(wallet._id, original.amount);
    if (!updated2) throw new Error('Failed to release hold — heldBalance lower than expected');

    const releaseTx = await txRepo.create({
      walletId: updated2._id,
      userId: updated2.userId,
      type: 'release' as WalletTxType,
      source: 'order_refund' as WalletTxSource,
      amount: original.amount,
      currency: updated2.currency,
      balanceBefore,
      balanceAfter: updated2.balance,
      referenceType: 'wallet_transaction',
      referenceId: original._id,
      description: `Release: ${reason}`,
      isReversed: false,
    });

    return { wallet: updated2, transaction: releaseTx };
  }

  async freeze(userId: string | Types.ObjectId, reason: string) {
    const wallet = await this.getOrCreateWallet(userId);
    return walletRepo.update(wallet._id, { isFrozen: true, frozenReason: reason });
  }

  async unfreeze(userId: string | Types.ObjectId) {
    const wallet = await this.getOrCreateWallet(userId);
    return walletRepo.update(wallet._id, { isFrozen: false, frozenReason: undefined });
  }

  async adminAdjust(userId: string, amount: number, type: 'credit' | 'debit', description: string, source: WalletTxSource = 'admin_adjustment') {
    if (type === 'credit') {
      return this.credit({ userId, amount, source, description });
    } else {
      return this.debit({ userId, amount, source, description });
    }
  }
}

export const walletService = new WalletService();
