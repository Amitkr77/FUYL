import mongoose from 'mongoose';
import { CashbackPolicyRepository, CashbackEarningRepository } from '../repositories/cashback.repository';
import { ICashbackPolicy } from '../models/cashbackPolicy.model';
import { UserModel } from '../../identity/models/user.model';
import { walletService } from '../../wallet/services/wallet.service';
import { logger } from '../../../config/logger';
import { BadRequestError, NotFoundError } from '../../../shared/errors';
import { addDays, fromPaise, toPaise } from '../../../shared/utils';

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
    creditAfterDays?: number;
    mode: string;
  }>;
  /** Total cashback the customer will earn (sum across all applicable policies). */
  totalCashback: number;
}

export interface PlaceCashbackInput {
  orderId: string;
  userId: string;
  /** Original pre-discount subtotal — this IS the cashback base (business rule: cashback is
   * always calculated on the original order value, regardless of discount or wallet payment). */
  subtotal: number;
  couponCode?: string;
  items?: CashbackLineItem[];
  /** Immutable policy decisions captured by checkout at order placement. */
  snapshot?: CashbackPreviewResult;
}

export interface CashbackLineItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export class CashbackService {
  /**
   * Determine which policies apply and how much cashback the user will earn.
   * Called during checkout preview so the UI can show "Earn ₹X cashback" before confirm.
   */
  async preview(input: {
    userId: string;
    subtotal: number;
    couponCode?: string;
    items?: CashbackLineItem[];
  }): Promise<CashbackPreviewResult> {
    // Business rule: cashback base is always the original order value before discount
    // and before wallet payment. Neither the discount nor the wallet redemption reduces
    // the cashback the customer earns.
    const cashbackBase = fromPaise(toPaise(input.subtotal));
    const applicablePolicies = await this.resolveApplicablePolicies(
      input.userId,
      cashbackBase,
      input.couponCode,
      input.items
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
      creditAfterDays:p.creditAfterDays,
      mode:           p.mode,
    }));

    return {
      eligible:      true,
      policies,
      totalCashback: fromPaise(policies.reduce((sum, policy) => sum + toPaise(policy.cashbackAmount), 0)),
    };
  }

  /**
   * Create CashbackEarning records immediately after order placement.
   * Earnings with 'on_order' timing are credited immediately; others are
   * scheduled for later (delivery event or cron job).
   */
  async createEarnings(input: PlaceCashbackInput): Promise<void> {
    // Business rule: cashback base is always the original order value before discount
    // and before wallet payment.
    const cashbackBase = fromPaise(toPaise(input.subtotal));
    const livePolicies = input.snapshot
      ? null
      : await this.resolveApplicablePolicies(input.userId, cashbackBase, input.couponCode, input.items);
    const policies = input.snapshot?.policies ?? (livePolicies ?? []).map((policy) => ({
      policyId: policy._id.toString(),
      name: policy.name,
      cashbackAmount: this.computeAmount(policy, cashbackBase),
      creditTiming: policy.creditTiming,
      creditAfterDays: policy.creditAfterDays,
      expiryDays: policy.expiryDays,
      mode: policy.mode,
    }));

    for (const policy of policies) {
      const amount = fromPaise(toPaise(policy.cashbackAmount));
      if (amount <= 0) continue;

      const scheduledAt = this.computeScheduledAtSnapshot(policy.creditTiming, policy.creditAfterDays);
      const expiresAt   = addDays(scheduledAt, policy.expiryDays);

      let earning;
      try {
        earning = await earningRepo.create({
          orderId:           new mongoose.Types.ObjectId(input.orderId),
          userId:            new mongoose.Types.ObjectId(input.userId),
          policyId:          new mongoose.Types.ObjectId(policy.policyId),
          cashbackBase,
          cashbackAmount:    amount,
          status:            'pending',
          creditTiming:      policy.creditTiming,
          creditAfterDays:   policy.creditAfterDays,
          scheduledCreditAt: scheduledAt,
          expiresAt,
          couponCode:        input.couponCode?.toUpperCase(),
          metadata:          { policyMode: policy.mode, policyName: policy.name, quotedAtCheckout: Boolean(input.snapshot) },
        });
      } catch (err: any) {
        // Duplicate key error (E11000): earning already exists for this order+policy.
        // This happens if the ORDER_PLACED event is redelivered — safe to skip.
        if (err?.code === 11000) {
          logger.warn('[cashback] duplicate earning skipped for order+policy', {
            orderId: input.orderId,
            policyId: policy.policyId,
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
    const pending = await earningRepo.findById(earningId);
    if (!pending || pending.status !== 'pending') return;
    const earning = await earningRepo.claimProcessingWithBudget(
      earningId,
      fromPaise(toPaise(pending.cashbackAmount))
    );
    if (!earning) return;

    try {
      const { OrderModel } = await import('../../order/models/order.model');
      const order = await OrderModel.findById(earning.orderId).select('orderNumber').lean();
      const result = await walletService.credit({
        userId: earning.userId.toString(),
        amount: fromPaise(toPaise(earning.cashbackAmount)),
        source: 'order_cashback',
        description: `Cashback for order ${order?.orderNumber ?? 'your order'}`,
        referenceType: 'cashback_earning',
        referenceId: earning._id.toString(),
        expiresAt: earning.expiresAt,
        metadata: { orderId: earning.orderId.toString(), policyId: earning.policyId?.toString() },
      });
      const completed = await earningRepo.completeCredited(
        earningId,
        result.transaction._id as mongoose.Types.ObjectId
      );
      if (!completed) throw new Error('Cashback earning lost its processing claim');
      logger.info(`[cashback] credited ₹${earning.cashbackAmount} for earning ${earningId}`);
    } catch (error) {
      await earningRepo.requeueProcessing(earningId);
      logger.error('[cashback] earning credit failed and was queued for idempotent retry', { earningId, error });
    }
  }

  private async creditEarningLegacy(earningId: string): Promise<void> {
    const earning = await earningRepo.findById(earningId);
    if (!earning || earning.status !== 'pending') return;

    let transaction;
    try {
      const { OrderModel } = await import('../../order/models/order.model');
      const order = await OrderModel.findById(earning.orderId).select('orderNumber').lean();
      const orderLabel = order?.orderNumber ?? 'your order';
      const result = await walletService.credit({
        userId:        earning.userId.toString(),
        amount:        earning.cashbackAmount,
        source:        'order_cashback',
        description:   `Cashback for order ${orderLabel}`,
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
  async reverseEarnings(orderId: string, orderNumber?: string): Promise<void> {
    if (!orderNumber) {
      const { OrderModel } = await import('../../order/models/order.model');
      const order = await OrderModel.findById(orderId).select('orderNumber').lean();
      orderNumber = order?.orderNumber;
    }
    const orderLabel = orderNumber ?? 'your order';
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
            `Order ${orderLabel} cancelled`
          );
          // Only mark reversed AFTER wallet reversal confirms success.
          await earningRepo.updateStatus(earning._id.toString(), 'reversed');
          if (earning.policyId) {
            await policyRepo.decrementUsedBudget(earning.policyId.toString(), earning.cashbackAmount);
          }
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

  async getPolicy(id: string) {
    const policy = await policyRepo.findById(id);
    if (!policy) throw new NotFoundError('CashbackPolicy');

    let allowedUsers: { id: string; email: string; name: string }[] = [];
    if (policy.allowedUserIds?.length) {
      const users = await UserModel.find({ _id: { $in: policy.allowedUserIds } })
        .select('email firstName lastName displayName')
        .lean<{ _id: mongoose.Types.ObjectId; email: string; firstName?: string; lastName?: string; displayName?: string }[]>();
      allowedUsers = users.map((u) => ({
        id:    u._id.toString(),
        email: u.email,
        name:  u.displayName || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
      }));
    }

    return Object.assign(policy.toObject(), { allowedUsers });
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
    const recovered = await earningRepo.requeueStaleProcessing(new Date(Date.now() - 15 * 60 * 1000));
    if (recovered > 0) logger.warn(`[cashback.cron] recovered ${recovered} stale processing earnings`);
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
    couponCode?: string,
    items: CashbackLineItem[] = []
  ): Promise<ICashbackPolicy[]> {
    const applicable: ICashbackPolicy[] = [];

    // 1. Check for an attached policy linked to the coupon code
    if (couponCode) {
      const attached = await policyRepo.findActiveByCoupon(couponCode);
      if (attached && this.isEligible(attached, cashbackBase, userId, items) && !this.isBudgetExhausted(attached)) {
        const uses = await earningRepo.countUserEarnings(userId, attached._id.toString());
        if (attached.maxUsesPerUser === 0 || uses < attached.maxUsesPerUser) {
          applicable.push(attached);
        }
      }
    }

    // 2. Check standalone policies (stack on top of attached)
    const standalone = await policyRepo.findActiveStandalone();
    for (const policy of standalone) {
      if (!this.isEligible(policy, cashbackBase, userId, items)) continue;
      if (this.isBudgetExhausted(policy)) continue;
      const uses = await earningRepo.countUserEarnings(userId, policy._id.toString());
      if (policy.maxUsesPerUser > 0 && uses >= policy.maxUsesPerUser) continue;
      applicable.push(policy);
    }

    return applicable;
  }

  private isEligible(
    policy: ICashbackPolicy,
    cashbackBase: number,
    userId: string,
    items: CashbackLineItem[]
  ): boolean {
    if (policy.minOrderAmount && cashbackBase < policy.minOrderAmount) return false;
    // If the policy targets specific users, the placing user must be on the list
    if (policy.allowedUserIds?.length > 0) {
      const allowed = policy.allowedUserIds.some((id) => id.toString() === userId);
      if (!allowed) return false;
    }
    if (policy.scope === 'specific_products') {
      const targets = new Set(policy.scopeIds ?? []);
      if (!items.some((item) => targets.has(item.productId))) return false;
    }
    return true;
  }

  private isBudgetExhausted(policy: ICashbackPolicy): boolean {
    if (policy.totalBudget === 0) return false;
    return policy.usedBudget >= policy.totalBudget;
  }

  private computeAmount(policy: ICashbackPolicy, cashbackBase: number): number {
    const basePaise = toPaise(cashbackBase);
    let amountPaise = policy.type === 'percentage'
      ? Math.floor((basePaise * policy.value) / 100)
      : toPaise(policy.value);
    if (policy.maxCap) amountPaise = Math.min(amountPaise, toPaise(policy.maxCap));
    return fromPaise(Math.max(0, amountPaise));
  }

  private computeScheduledAtSnapshot(creditTiming: string, creditAfterDays?: number): Date {
    const now = new Date();
    if (creditTiming === 'on_order') return now;
    if (creditTiming === 'after_days') return addDays(now, creditAfterDays ?? 7);
    // on_delivery — set far-future placeholder; actual crediting is triggered by event
    return addDays(now, 365);
  }
}

export const cashbackService = new CashbackService();
