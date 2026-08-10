import mongoose from 'mongoose';
import { CashbackPolicyRepository, CashbackEarningRepository } from '../repositories/cashback.repository';
import { ICashbackPolicy } from '../models/cashbackPolicy.model';
import { walletService } from '../../wallet/services/wallet.service';
import { logger } from '../../../config/logger';
import { BadRequestError, NotFoundError } from '../../../shared/errors';
import { addDays } from '../../../shared/utils';

const policyRepo = new CashbackPolicyRepository();
const earningRepo = new CashbackEarningRepository();

export interface CashbackPreviewResult {
  eligible: boolean;
  policies: Array<{
    policyId: string;
    name: string;
    cashbackAmount: number;
    creditTiming: string;
    expiryDays: number;
    mode: string;
  }>;
  /** Total cashback the customer will earn (sum across all applicable policies). */
  totalCashback: number;
}

export interface PlaceCashbackInput {
  orderId: string;
  userId: string;
  /** Pre-discount subtotal from the pricing quote. */
  subtotal: number;
  /** Wallet-paid portion (Option B: excluded from cashback base). */
  walletRedemption: number;
  couponCode?: string;
}

export class CashbackService {
  /**
   * Determine which policies apply and how much cashback the user will earn.
   * Called during checkout preview so the UI can show "Earn ₹X cashback" before confirm.
   */
  async preview(input: {
    userId: string;
    subtotal: number;
    walletRedemption: number;
    couponCode?: string;
  }): Promise<CashbackPreviewResult> {
    const cashbackBase = Math.max(0, input.subtotal - input.walletRedemption);
    const applicablePolicies = await this.resolveApplicablePolicies(
      input.userId,
      cashbackBase,
      input.couponCode
    );

    if (applicablePolicies.length === 0) {
      return { eligible: false, policies: [], totalCashback: 0 };
    }

    const policies = applicablePolicies.map((p) => ({
      policyId:       p._id.toString(),
      name:           p.name,
      cashbackAmount: this.computeAmount(p, cashbackBase),
      creditTiming:   p.creditTiming,
      expiryDays:     p.expiryDays,
      mode:           p.mode,
    }));

    return {
      eligible:      true,
      policies,
      totalCashback: policies.reduce((s, p) => s + p.cashbackAmount, 0),
    };
  }

  /**
   * Create CashbackEarning records immediately after order placement.
   * Earnings with 'on_order' timing are credited immediately; others are
   * scheduled for later (delivery event or cron job).
   */
  async createEarnings(input: PlaceCashbackInput): Promise<void> {
    const cashbackBase = Math.max(0, input.subtotal - input.walletRedemption);
    const policies = await this.resolveApplicablePolicies(
      input.userId,
      cashbackBase,
      input.couponCode
    );

    for (const policy of policies) {
      const amount = this.computeAmount(policy, cashbackBase);
      if (amount <= 0) continue;

      const scheduledAt = this.computeScheduledAt(policy);
      const expiresAt   = addDays(scheduledAt, policy.expiryDays);

      let earning;
      try {
        earning = await earningRepo.create({
          orderId:           new mongoose.Types.ObjectId(input.orderId),
          userId:            new mongoose.Types.ObjectId(input.userId),
          policyId:          new mongoose.Types.ObjectId(policy._id.toString()),
          cashbackBase,
          cashbackAmount:    amount,
          status:            'pending',
          creditTiming:      policy.creditTiming,
          creditAfterDays:   policy.creditAfterDays,
          scheduledCreditAt: scheduledAt,
          expiresAt,
          couponCode:        input.couponCode?.toUpperCase(),
          metadata:          { policyMode: policy.mode },
        });
      } catch (err: any) {
        // Duplicate key error (E11000): earning already exists for this order+policy.
        // This happens if the ORDER_PLACED event is redelivered — safe to skip.
        if (err?.code === 11000) {
          logger.warn('[cashback] duplicate earning skipped for order+policy', {
            orderId: input.orderId,
            policyId: policy._id.toString(),
          });
          continue;
        }
        throw err;
      }

      if (policy.creditTiming === 'on_order') {
        await this.creditEarning(earning._id.toString());
      }
    }
  }

  /**
   * Credit a single pending earning — used by on_delivery event handler
   * and the after_days cron job.
   *
   * Concurrency safety:
   * - walletService.credit() is idempotent via referenceType+referenceId, so the
   *   wallet is credited at most once even if this method is called concurrently.
   * - earningRepo.claimCredited() atomically transitions status from 'pending' →
   *   'credited'; only the caller that wins the race increments the policy budget,
   *   preventing double-counting.
   */
  async creditEarning(earningId: string): Promise<void> {
    const earning = await earningRepo.findById(earningId);
    if (!earning || earning.status !== 'pending') return;

    let transaction;
    try {
      const result = await walletService.credit({
        userId:        earning.userId.toString(),
        amount:        earning.cashbackAmount,
        source:        'order_cashback',
        description:   'Order cashback',
        referenceType: 'cashback_earning',
        referenceId:   earning._id.toString(),
        expiresAt:     earning.expiresAt,
        metadata:      {
          orderId:  earning.orderId.toString(),
          policyId: earning.policyId?.toString(),
        },
      });
      transaction = result.transaction;
    } catch (err) {
      // Leave the earning in 'pending' state so the cron job can retry.
      logger.error('[cashback] wallet credit failed for earning', { earningId, err });
      return;
    }

    // Atomically claim the earning (pending → credited). If another process already
    // claimed it (race condition), skip the budget increment to avoid double-counting.
    const claimed = await earningRepo.claimCredited(
      earningId,
      transaction._id as mongoose.Types.ObjectId
    );
    if (!claimed) {
      logger.warn('[cashback] earning already claimed by another process, skipping budget increment', { earningId });
      return;
    }

    if (earning.policyId) {
      await policyRepo.incrementUsedBudget(earning.policyId.toString(), earning.cashbackAmount);
    }

    logger.info(`[cashback] credited ₹${earning.cashbackAmount} for earning ${earningId}`);
  }

  /**
   * Reverse all pending/credited earnings for an order (called on cancellation).
   *
   * Safety: credited earnings are only marked 'reversed' after the wallet
   * reversal succeeds. If the wallet reversal fails, the earning stays 'credited'
   * and is flagged for manual reconciliation — never silently dropped.
   */
  async reverseEarnings(orderId: string): Promise<void> {
    const earnings = await earningRepo.findByOrder(orderId);
    for (const earning of earnings) {
      if (earning.status === 'reversed') continue;

      if (earning.status === 'credited') {
        if (!earning.walletTransactionId) {
          // Credited status but no wallet tx — data inconsistency; log and skip.
          logger.error('[cashback] credited earning has no walletTransactionId, cannot reverse', {
            earningId: earning._id.toString(),
          });
          continue;
        }
        try {
          await walletService.reverse(
            earning.walletTransactionId.toString(),
            `Order ${orderId} cancelled`
          );
          // Only mark reversed AFTER wallet reversal confirms success.
          await earningRepo.updateStatus(earning._id.toString(), 'reversed');
        } catch (err) {
          // Leave in 'credited' state — manual reconciliation required.
          logger.error('[cashback] wallet reversal failed, earning NOT marked reversed', {
            earningId: earning._id.toString(),
            orderId,
            err,
          });
        }
      } else {
        // 'pending' or 'expired' — cancel directly, no wallet credit to reverse.
        await earningRepo.updateStatus(earning._id.toString(), 'reversed');
      }
    }
  }

  /**
   * Credit all pending earnings for an order with 'on_delivery' timing.
   * Called when the ORDER_DELIVERED event fires.
   */
  async creditDeliveryEarnings(orderId: string): Promise<void> {
    const earnings = await earningRepo.findByOrder(orderId);
    for (const earning of earnings) {
      if (earning.status === 'pending' && earning.creditTiming === 'on_delivery') {
        await this.creditEarning(earning._id.toString());
      }
    }
  }

  // ─── Admin CRUD for policies ──────────────────────────────────────────────

  async createPolicy(data: Partial<ICashbackPolicy>): Promise<ICashbackPolicy> {
    if (data.mode === 'attached' && !data.couponCode) {
      throw new BadRequestError('couponCode is required for attached mode policies');
    }
    return policyRepo.create(data);
  }

  async updatePolicy(id: string, patch: Partial<ICashbackPolicy>): Promise<ICashbackPolicy> {
    const updated = await policyRepo.update(id, patch);
    if (!updated) throw new NotFoundError('CashbackPolicy');
    return updated;
  }

  async deletePolicy(id: string): Promise<void> {
    const policy = await policyRepo.findById(id);
    if (!policy) throw new NotFoundError('CashbackPolicy');
    await policyRepo.delete(id);
  }

  async listPolicies(filter: Record<string, unknown> = {}, page = 1, limit = 20) {
    return policyRepo.findAll(filter, page, limit);
  }

  async getPolicy(id: string): Promise<ICashbackPolicy> {
    const policy = await policyRepo.findById(id);
    if (!policy) throw new NotFoundError('CashbackPolicy');
    return policy;
  }

  async listEarnings(filter: Record<string, unknown> = {}, page = 1, limit = 20) {
    return earningRepo.findAll(filter, page, limit);
  }

  async getUserEarnings(userId: string, page = 1, limit = 20) {
    return earningRepo.findByUser(userId, page, limit);
  }

  // ─── Cron job entry point ─────────────────────────────────────────────────

  /**
   * Process all 'after_days' earnings whose scheduledCreditAt has passed.
   * Called hourly by the scheduler.
   */
  async processDueEarnings(): Promise<void> {
    const due = await earningRepo.findDuePending();
    logger.info(`[cashback.cron] processing ${due.length} due earnings`);
    for (const earning of due) {
      await this.creditEarning(earning._id.toString());
    }
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async resolveApplicablePolicies(
    userId: string,
    cashbackBase: number,
    couponCode?: string
  ): Promise<ICashbackPolicy[]> {
    const applicable: ICashbackPolicy[] = [];

    // 1. Check for an attached policy linked to the coupon code
    if (couponCode) {
      const attached = await policyRepo.findActiveByCoupon(couponCode);
      if (attached && this.isEligible(attached, cashbackBase) && !this.isBudgetExhausted(attached)) {
        const uses = await earningRepo.countUserEarnings(userId, attached._id.toString());
        if (attached.maxUsesPerUser === 0 || uses < attached.maxUsesPerUser) {
          applicable.push(attached);
        }
      }
    }

    // 2. Check standalone policies (stack on top of attached)
    const standalone = await policyRepo.findActiveStandalone();
    for (const policy of standalone) {
      if (!this.isEligible(policy, cashbackBase)) continue;
      if (this.isBudgetExhausted(policy)) continue;
      const uses = await earningRepo.countUserEarnings(userId, policy._id.toString());
      if (policy.maxUsesPerUser > 0 && uses >= policy.maxUsesPerUser) continue;
      applicable.push(policy);
    }

    return applicable;
  }

  private isEligible(policy: ICashbackPolicy, cashbackBase: number): boolean {
    if (policy.minOrderAmount && cashbackBase < policy.minOrderAmount) return false;
    return true;
  }

  private isBudgetExhausted(policy: ICashbackPolicy): boolean {
    if (policy.totalBudget === 0) return false;
    return policy.usedBudget >= policy.totalBudget;
  }

  private computeAmount(policy: ICashbackPolicy, cashbackBase: number): number {
    let amount =
      policy.type === 'percentage'
        ? (cashbackBase * policy.value) / 100
        : policy.value;
    if (policy.maxCap && amount > policy.maxCap) amount = policy.maxCap;
    // Use integer paise arithmetic to avoid floating-point drift in INR
    return Math.floor(amount * 100) / 100;
  }

  private computeScheduledAt(policy: ICashbackPolicy): Date {
    const now = new Date();
    if (policy.creditTiming === 'on_order') return now;
    if (policy.creditTiming === 'after_days') return addDays(now, policy.creditAfterDays ?? 7);
    // on_delivery — set far-future placeholder; actual crediting is triggered by event
    return addDays(now, 365);
  }
}

export const cashbackService = new CashbackService();
