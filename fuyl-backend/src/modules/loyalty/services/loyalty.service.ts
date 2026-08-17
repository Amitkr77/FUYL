import mongoose from 'mongoose';
import {
  LoyaltyConfigRepository,
  LoyaltyAccountRepository,
  LoyaltyTransactionRepository,
} from '../repositories/loyalty.repository';
import { ILoyaltyConfig } from '../models/loyaltyConfig.model';
import { logger } from '../../../config/logger';
import { BadRequestError, NotFoundError } from '../../../shared/errors';

const configRepo = new LoyaltyConfigRepository();
const accountRepo = new LoyaltyAccountRepository();
const txRepo = new LoyaltyTransactionRepository();

export class LoyaltyService {
  // ─── Private helpers ────────────────────────────────────────────────────────

  /**
   * Compute the monetary base used for point earning, based on the config's
   * eligibleBase setting and optional include flags.
   */
  private computeEligibleBase(
    config: ILoyaltyConfig,
    orderData: {
      subtotal: number;
      discountTotal: number;
      shippingTotal: number;
      taxTotal: number;
      walletRedemption: number;
      grandTotal: number;
    }
  ): number {
    const { subtotal, discountTotal, shippingTotal, taxTotal, walletRedemption, grandTotal } = orderData;
    const discountedSubtotal = Math.max(0, subtotal - discountTotal);

    let base: number;
    switch (config.eligibleBase) {
      case 'original_subtotal':
        base = subtotal;
        break;
      case 'discounted_subtotal':
        base = discountedSubtotal;
        break;
      case 'order_total':
        base = grandTotal;
        break;
      case 'order_total_excl_shipping':
        base = Math.max(0, grandTotal - shippingTotal);
        break;
      case 'amount_paid':
        base = Math.max(0, grandTotal - walletRedemption);
        break;
      default:
        base = discountedSubtotal;
    }

    if (config.includeShipping && config.eligibleBase !== 'order_total') {
      base += shippingTotal;
    }
    if (config.includeTax && config.eligibleBase !== 'order_total') {
      base += taxTotal;
    }
    if (!config.includeWalletPaid && config.eligibleBase === 'amount_paid') {
      // already excluded above via grandTotal - walletRedemption
    } else if (!config.includeWalletPaid && config.eligibleBase !== 'amount_paid') {
      base = Math.max(0, base - walletRedemption);
    }

    return Math.max(0, base);
  }

  /** Calculate how many points to award for the given eligible base. */
  private computePoints(config: ILoyaltyConfig, eligibleBase: number): number {
    return Math.floor(eligibleBase / config.earnSpend) * config.earnPoints;
  }

  /** Convert a points amount into its monetary (₹) value. */
  computeRedemptionValue(config: ILoyaltyConfig, points: number): number {
    return Math.floor(points / config.redeemPoints) * config.redeemValue;
  }

  // ─── Customer-facing methods ────────────────────────────────────────────────

  async getBalance(userId: string) {
    try {
      const config = await configRepo.findActive();
      const account = await accountRepo.findOrCreateByUser(userId);

      const minRedeemPoints = config?.minRedeemPoints ?? 0;
      const redeemableValue = config
        ? this.computeRedemptionValue(config, account.balance)
        : 0;

      return {
        balance:          account.balance,
        lifetimeEarned:   account.lifetimeEarned,
        lifetimeRedeemed: account.lifetimeRedeemed,
        redeemableValue,
        canRedeem:        account.balance >= minRedeemPoints,
        minRedeemPoints,
      };
    } catch (err) {
      logger.error('[loyalty] getBalance failed', { userId, err });
      throw err;
    }
  }

  async previewRedemption(userId: string, orderTotal: number) {
    try {
      const config = await configRepo.findActive();
      if (!config) {
        return {
          availablePoints: 0,
          pointsToRedeem: 0,
          monetaryValue: 0,
          canRedeem: false,
          reason: 'Loyalty programme is not configured',
        };
      }

      const account = await accountRepo.findOrCreateByUser(userId);

      if (account.balance < config.minRedeemPoints) {
        return {
          availablePoints: account.balance,
          pointsToRedeem: 0,
          monetaryValue: 0,
          canRedeem: false,
          reason: `Minimum ${config.minRedeemPoints} points required to redeem`,
        };
      }

      let pointsToRedeem = account.balance;

      // Cap by maxRedeemPointsPerOrder
      if (config.maxRedeemPointsPerOrder > 0) {
        pointsToRedeem = Math.min(pointsToRedeem, config.maxRedeemPointsPerOrder);
      }

      // Cap by maxRedeemPercent of order total
      if (config.maxRedeemPercent > 0 && orderTotal > 0) {
        const maxMonetaryFromPercent = (orderTotal * config.maxRedeemPercent) / 100;
        // Convert the monetary cap back to points (how many blocks fit?)
        const maxPointsFromPercent =
          Math.floor(maxMonetaryFromPercent / config.redeemValue) * config.redeemPoints;
        pointsToRedeem = Math.min(pointsToRedeem, maxPointsFromPercent);
      }

      const monetaryValue = this.computeRedemptionValue(config, pointsToRedeem);

      return {
        availablePoints: account.balance,
        pointsToRedeem,
        monetaryValue,
        canRedeem: monetaryValue > 0,
        reason: monetaryValue === 0 ? 'Not enough points for a redemption unit' : undefined,
      };
    } catch (err) {
      logger.error('[loyalty] previewRedemption failed', { userId, err });
      throw err;
    }
  }

  // ─── Core earn / redeem / reverse ──────────────────────────────────────────

  async earnPoints(input: {
    userId: string;
    orderId: string;
    subtotal: number;
    discountTotal: number;
    shippingTotal: number;
    taxTotal: number;
    walletRedemption: number;
    grandTotal: number;
  }): Promise<{ points: number } | null> {
    try {
      const config = await configRepo.findActive();
      if (!config) {
        logger.info('[loyalty] earnPoints skipped — no active config', { orderId: input.orderId });
        return null;
      }

      // Idempotency check — skip if an earn tx for this order already exists
      const existing = await txRepo.findByReference('order', input.orderId);
      const alreadyEarned = existing.find((tx) => tx.type === 'earn');
      if (alreadyEarned) {
        logger.info('[loyalty] earnPoints skipped — already earned for order', { orderId: input.orderId });
        return { points: alreadyEarned.points };
      }

      const eligibleBase = this.computeEligibleBase(config, input);
      const points = this.computePoints(config, eligibleBase);

      if (points <= 0) {
        logger.info('[loyalty] earnPoints — 0 points computed, skipping', { orderId: input.orderId });
        return { points: 0 };
      }

      const account = await accountRepo.findOrCreateByUser(input.userId);
      const updatedAccount = await accountRepo.applyDelta(account._id.toString(), points);
      if (!updatedAccount) {
        logger.error('[loyalty] earnPoints — applyDelta returned null', { userId: input.userId });
        return null;
      }

      const expiresAt =
        config.pointExpiryDays > 0
          ? new Date(Date.now() + config.pointExpiryDays * 24 * 60 * 60 * 1000)
          : undefined;

      await txRepo.create({
        userId:        new mongoose.Types.ObjectId(input.userId),
        type:          'earn',
        points,
        balanceBefore: account.balance,
        balanceAfter:  updatedAccount.balance,
        referenceType: 'order',
        referenceId:   new mongoose.Types.ObjectId(input.orderId),
        description:   `Earned ${points} points for order delivery`,
        expiresAt,
      });

      logger.info(`[loyalty] earned ${points} points for user ${input.userId} on order ${input.orderId}`);
      return { points };
    } catch (err: any) {
      // Swallow duplicate key errors from the unique index — same idempotency guard
      if (err?.code === 11000) {
        logger.warn('[loyalty] earnPoints — duplicate key, already recorded', { orderId: input.orderId });
        return null;
      }
      logger.error('[loyalty] earnPoints failed', { orderId: input.orderId, err });
      throw err;
    }
  }

  async redeemPoints(input: {
    userId: string;
    orderId: string;
    pointsRequested: number;
    orderTotal: number;
  }): Promise<{ pointsRedeemed: number; monetaryValue: number }> {
    try {
      const config = await configRepo.findActive();
      if (!config) throw new BadRequestError('Loyalty programme is not active');

      // Idempotency check
      const existing = await txRepo.findByReference('order', input.orderId);
      const alreadyRedeemed = existing.find((tx) => tx.type === 'redeem');
      if (alreadyRedeemed) {
        const monetaryValue = this.computeRedemptionValue(config, Math.abs(alreadyRedeemed.points));
        return { pointsRedeemed: Math.abs(alreadyRedeemed.points), monetaryValue };
      }

      const account = await accountRepo.findOrCreateByUser(input.userId);

      if (account.balance < config.minRedeemPoints) {
        throw new BadRequestError(`Minimum ${config.minRedeemPoints} points required to redeem`);
      }

      let pointsToRedeem = Math.min(input.pointsRequested, account.balance);

      // Cap by maxRedeemPointsPerOrder
      if (config.maxRedeemPointsPerOrder > 0) {
        pointsToRedeem = Math.min(pointsToRedeem, config.maxRedeemPointsPerOrder);
      }

      // Cap by maxRedeemPercent
      if (config.maxRedeemPercent > 0 && input.orderTotal > 0) {
        const maxMonetary = (input.orderTotal * config.maxRedeemPercent) / 100;
        const maxPointsFromPercent =
          Math.floor(maxMonetary / config.redeemValue) * config.redeemPoints;
        pointsToRedeem = Math.min(pointsToRedeem, maxPointsFromPercent);
      }

      // Enforce partial redemption rules
      if (!config.allowPartialRedemption && pointsToRedeem < input.pointsRequested) {
        throw new BadRequestError('Partial redemption is not allowed for this order');
      }

      const monetaryValue = this.computeRedemptionValue(config, pointsToRedeem);
      if (monetaryValue <= 0) {
        throw new BadRequestError('Not enough points for a redemption unit');
      }

      // Debit the account
      const updatedAccount = await accountRepo.applyDelta(account._id.toString(), -pointsToRedeem);
      if (!updatedAccount) {
        throw new BadRequestError('Insufficient points balance');
      }

      await txRepo.create({
        userId:        new mongoose.Types.ObjectId(input.userId),
        type:          'redeem',
        points:        -pointsToRedeem,
        balanceBefore: account.balance,
        balanceAfter:  updatedAccount.balance,
        referenceType: 'order',
        referenceId:   new mongoose.Types.ObjectId(input.orderId),
        description:   `Redeemed ${pointsToRedeem} points (₹${monetaryValue}) on order`,
      });

      logger.info(`[loyalty] redeemed ${pointsToRedeem} points (₹${monetaryValue}) for user ${input.userId}`);
      return { pointsRedeemed: pointsToRedeem, monetaryValue };
    } catch (err: any) {
      if (err?.code === 11000) {
        logger.warn('[loyalty] redeemPoints — duplicate key, already recorded', { orderId: input.orderId });
        // Re-derive the value from what was actually stored
        const existing = await txRepo.findByReference('order', input.orderId);
        const redeemTx = existing.find((tx) => tx.type === 'redeem');
        if (redeemTx) {
          const config = await configRepo.findActive();
          const pts = Math.abs(redeemTx.points);
          const val = config ? this.computeRedemptionValue(config, pts) : 0;
          return { pointsRedeemed: pts, monetaryValue: val };
        }
        return { pointsRedeemed: 0, monetaryValue: 0 };
      }
      logger.error('[loyalty] redeemPoints failed', { orderId: input.orderId, err });
      throw err;
    }
  }

  async reverseEarn(orderId: string, userId: string, trigger: 'cancel' | 'refund' = 'cancel'): Promise<void> {
    try {
      const config = await configRepo.findActive();
      const shouldReverse = trigger === 'refund' ? config?.reverseOnRefund : config?.reverseOnCancel;
      if (config && !shouldReverse) {
        logger.info(`[loyalty] reverseEarn skipped — ${trigger} reversal disabled`, { orderId });
        return;
      }

      const txList = await txRepo.findByReference('order', orderId);
      const earnTx = txList.find((tx) => tx.type === 'earn' && !tx.isReversed);
      if (!earnTx) {
        logger.info('[loyalty] reverseEarn — no earn transaction found for order', { orderId });
        return;
      }

      const account = await accountRepo.findOrCreateByUser(userId);
      // Debit the earned points — but cap at current balance (don't go negative)
      const pointsToReverse = Math.min(earnTx.points, account.balance);

      const updatedAccount = await accountRepo.applyDelta(account._id.toString(), -pointsToReverse);
      const balanceAfter = updatedAccount ? updatedAccount.balance : Math.max(0, account.balance - pointsToReverse);

      const reverseTx = await txRepo.create({
        userId:        new mongoose.Types.ObjectId(userId),
        type:          'reverse',
        points:        -pointsToReverse,
        balanceBefore: account.balance,
        balanceAfter,
        referenceType: 'order',
        referenceId:   new mongoose.Types.ObjectId(orderId),
        description:   `Reversed earn of ${pointsToReverse} points — order ${trigger === 'refund' ? 'returned/refunded' : 'cancelled'}`,
      });

      await txRepo.markReversed(earnTx._id.toString(), reverseTx._id.toString());
      logger.info(`[loyalty] reversed ${pointsToReverse} earn points for order ${orderId}`);
    } catch (err) {
      logger.error('[loyalty] reverseEarn failed', { orderId, err });
      throw err;
    }
  }

  async reverseRedeem(orderId: string, userId: string): Promise<void> {
    try {
      const txList = await txRepo.findByReference('order', orderId);
      const redeemTx = txList.find((tx) => tx.type === 'redeem' && !tx.isReversed);
      if (!redeemTx) {
        logger.info('[loyalty] reverseRedeem — no redeem transaction found for order', { orderId });
        return;
      }

      const pointsToReturn = Math.abs(redeemTx.points);
      const account = await accountRepo.findOrCreateByUser(userId);
      const updatedAccount = await accountRepo.applyDelta(account._id.toString(), pointsToReturn);
      const balanceAfter = updatedAccount ? updatedAccount.balance : account.balance + pointsToReturn;

      const reverseTx = await txRepo.create({
        userId:        new mongoose.Types.ObjectId(userId),
        type:          'reverse',
        points:        pointsToReturn,
        balanceBefore: account.balance,
        balanceAfter,
        referenceType: 'order',
        referenceId:   new mongoose.Types.ObjectId(orderId),
        description:   `Reversed redemption of ${pointsToReturn} points — order cancelled`,
      });

      await txRepo.markReversed(redeemTx._id.toString(), reverseTx._id.toString());
      logger.info(`[loyalty] reversed ${pointsToReturn} redeemed points for order ${orderId}`);
    } catch (err) {
      logger.error('[loyalty] reverseRedeem failed', { orderId, err });
      throw err;
    }
  }

  // ─── Admin methods ──────────────────────────────────────────────────────────

  async getTransactions(userId: string, page: number, limit: number) {
    try {
      return txRepo.findByUser(userId, page, limit);
    } catch (err) {
      logger.error('[loyalty] getTransactions failed', { userId, err });
      throw err;
    }
  }

  async getAccount(userId: string) {
    const account = await accountRepo.findOrCreateByUser(userId);
    return {
      balance: account.balance,
      lifetimeEarned: account.lifetimeEarned,
      lifetimeRedeemed: account.lifetimeRedeemed,
    };
  }

  async adminAdjust(userId: string, points: number, description: string): Promise<void> {
    try {
      const account = await accountRepo.findOrCreateByUser(userId);

      if (points < 0 && account.balance < Math.abs(points)) {
        throw new BadRequestError('Adjustment would bring balance below 0');
      }

      const updatedAccount = await accountRepo.applyDelta(account._id.toString(), points);
      const balanceAfter = updatedAccount ? updatedAccount.balance : account.balance + points;

      await txRepo.create({
        userId:        new mongoose.Types.ObjectId(userId),
        type:          'adjust',
        points,
        balanceBefore: account.balance,
        balanceAfter,
        referenceType: 'admin',
        description:   description || `Admin manual adjustment of ${points} points`,
      });

      logger.info(`[loyalty] admin adjusted ${points} points for user ${userId}`);
    } catch (err) {
      logger.error('[loyalty] adminAdjust failed', { userId, err });
      throw err;
    }
  }

  // ─── Config management ──────────────────────────────────────────────────────

  async getConfig(): Promise<ILoyaltyConfig | null> {
    try {
      // Admins must still be able to edit/reactivate an inactive config.
      return configRepo.findLatest();
    } catch (err) {
      logger.error('[loyalty] getConfig failed', { err });
      throw err;
    }
  }

  /** Operational checkout config; unlike the admin editor this excludes inactive records. */
  async getActiveConfig(): Promise<ILoyaltyConfig | null> {
    return configRepo.findActive();
  }

  async createConfig(data: Partial<ILoyaltyConfig>): Promise<ILoyaltyConfig> {
    try {
      return configRepo.create(data);
    } catch (err) {
      logger.error('[loyalty] createConfig failed', { err });
      throw err;
    }
  }

  async updateConfig(id: string, patch: Partial<ILoyaltyConfig>): Promise<ILoyaltyConfig> {
    try {
      const updated = await configRepo.update(id, patch);
      if (!updated) throw new NotFoundError('LoyaltyConfig');
      return updated;
    } catch (err) {
      logger.error('[loyalty] updateConfig failed', { id, err });
      throw err;
    }
  }

  async listConfigs(): Promise<ILoyaltyConfig[]> {
    try {
      return configRepo.findAll();
    } catch (err) {
      logger.error('[loyalty] listConfigs failed', { err });
      throw err;
    }
  }
}

export const loyaltyService = new LoyaltyService();
