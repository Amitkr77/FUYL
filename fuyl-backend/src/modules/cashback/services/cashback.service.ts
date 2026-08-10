import mongoose from 'mongoose';
import { CashbackPolicyRepository, CashbackEarningRepository } from '../repositories/cashback.repository';
import { ICashbackPolicy } from '../models/cashbackPolicy.model';
import { ICashbackEarning } from '../models/cashbackEarning.model';
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
  /** pre-discount subtotal from the pricing quote */
  subtotal: number;
  /** wallet-paid portion (Option B: excluded from cashback base) */
  walletRedemption: number;
  couponCode?: string;
}

export class CashbackService {
  /**
   * Determine which policies apply to an order and how much cashback the user
   * will earn. Called during checkout preview so the UI can show a "Earn ₹X
   * cashback" message before the user confirms.
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
      policyId: p._id.toString(),
      name: p.name,
      cashbackAmount: this.computeAmount(p, cashbackBase),
      creditTiming: p.creditTiming,
      expiryDays: p.expiryDays,
      mode: p.mode,
    }));

    return {
      eligible: true,
      policies,
      totalCashback: policies.reduce((s, p) => s + p.cashbackAmount, 0),
    };
  }

  /**
   * Create CashbackEarning records immediately after order placement.
   * Earnings with timing 'on_order' are credited right away; others are
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
      const expiresAt = addDays(scheduledAt, policy.expiryDays);

      const earning = await earningRepo.create({
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

      // Credit immediately for on_order timing
      if (policy.creditTiming === 'on_order') {
        await this.creditEarning(earning._id.toString());
      }
    }
  }

  /**
   * Credit a single pending earning — used by on_delivery event handler
   * and the after_days cron job.
   */
  async creditEarning(earningId: string): Promise<void> {
    const earning = await earningRepo.findById(earningId);
    if (!earning || earning.status !== 'pending') return;

    try {
      const { transaction } = await walletService.credit({
        userId:        earning.userId.toString(),
        amount:        earning.cashbackAmount,
        source:        'order_cashback',
        description:   `Cashback for order`,
        referenceType: 'cashback_earning',
        referenceId:   earning._id.toString(),
        expiresAt:     earning.expiresAt,
        metadata:      { orderId: earning.orderId.toString(), policyId: earning.policyId?.toString() },
      });

      await earningRepo.updateStatus(earningId, 'credited', {
        creditedAt:          new Date(),
        walletTransactionId: transaction._id,
      } as Partial<ICashbackEarning>);

      // Track budget consumption on the policy
      if (earning.policyId) {
        await policyRepo.incrementUsedBudget(earning.policyId.toString(), earning.cashbackAmount);
      }

      logger.info(`[cashback] credited ₹${earning.cashbackAmount} for earning ${earningId}`);
    } catch (err) {
      logger.error('[cashback] failed to credit earning', { earningId, err });
    }
  }

  /**
   * Reverse all pending/credited earnings for an order (called on cancellation).
   */
  async reverseEarnings(orderId: string): Promise<void> {
    const earnings = await earningRepo.findByOrder(orderId);
    for (const earning of earnings) {
      if (earning.status === 'reversed') continue;

      if (earning.status === 'credited' && earning.walletTransactionId) {
        try {
          await walletService.reverse(
            earning.walletTransactionId.toString(),
            `Order ${orderId} cancelled`
          );
        } catch (err) {
          logger.error('[cashback] failed to reverse wallet transaction for earning', {
            earningId: earning._id.toString(),
            err,
          });
        }
      }

      await earningRepo.updateStatus(earning._id.toString(), 'reversed');
    }
  }

  /**
   * Credit all pending earnings for an order that are tied to on_delivery timing.
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
   * Process all 'after_days' earnings whose scheduled time has passed.
   * Should be called by a scheduled job (e.g. every hour).
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

    // 1. If a coupon code is present, check for an attached policy first
    if (couponCode) {
      const attached = await policyRepo.findActiveByCoupon(couponCode);
      if (attached && this.isEligible(attached, cashbackBase)) {
        const uses = await earningRepo.countUserEarnings(userId, attached._id.toString());
        if (attached.maxUsesPerUser === 0 || uses < attached.maxUsesPerUser) {
          if (!this.isBudgetExhausted(attached)) {
            applicable.push(attached);
          }
        }
      }
    }

    // 2. Always check standalone policies (they stack with attached ones)
    const standalone = await policyRepo.findActiveStandalone();
    for (const policy of standalone) {
      if (!this.isEligible(policy, cashbackBase)) continue;
      const uses = await earningRepo.countUserEarnings(userId, policy._id.toString());
      if (policy.maxUsesPerUser > 0 && uses >= policy.maxUsesPerUser) continue;
      if (this.isBudgetExhausted(policy)) continue;
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
    return Math.round(amount * 100) / 100;
  }

  private computeScheduledAt(policy: ICashbackPolicy): Date {
    const now = new Date();
    if (policy.creditTiming === 'on_order') return now;
    if (policy.creditTiming === 'after_days') return addDays(now, policy.creditAfterDays ?? 7);
    // on_delivery — return a far-future date; actual crediting happens via event
    return addDays(now, 365);
  }
}

export const cashbackService = new CashbackService();
