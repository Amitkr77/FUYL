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
    return txRepo.findByUser(userId, {}, limit);
  }

  async credit(input: CreditInput) {
    if (input.amount <= 0) throw new BadRequestError('Credit amount must be positive');
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

  async debit(input: DebitInput) {
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
    const original = await txRepo.findById(transactionId);
    if (!original) throw new NotFoundError('Wallet transaction');
    if (original.type !== 'credit') throw new BadRequestError('Only credit transactions can be reversed');
    if (original.isReversed) throw new ConflictError('Transaction already reversed');

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
      description: `Reversal: ${reason}`,
      isReversed: false,
      metadata: { originalTxId: original._id, reason },
    });

    await txRepo.markReversed(original._id, reversalTx._id);
    logger.info(`[wallet] reversed tx ${original._id} — ₹${original.amount} (${reason})`);
  }

  /**
   * Hold funds for an in-progress order. Held funds are deducted from balance and
   * released when the order completes (→ debit + tx) or cancelled (→ release back to balance).
   */
  async hold(userId: string | Types.ObjectId, amount: number, referenceType: string, referenceId: string, description: string) {
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
