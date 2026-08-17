import { FilterQuery } from 'mongoose';
import { ICommission } from '../models/commission.model';
import { CommissionRepository } from '../repositories/commission.repository';
import { AffiliateRepository } from '../repositories/affiliate.repository';
import { ProgramRepository } from '../repositories/program.repository';
import { PayoutRepository } from '../repositories/payout.repository';
import { CommissionStatus, CommissionEventType } from '../../../shared/enums';
import { NotFoundError, ConflictError, BadRequestError } from '../../../shared/errors';
import { walletService } from '../../wallet/services/wallet.service';
import { logger } from '../../../config/logger';
import mongoose from 'mongoose';
import { fromPaise, proratePaise, toPaise } from '../../../shared/utils';

const commissionRepo = new CommissionRepository();
const affiliateRepo  = new AffiliateRepository();
const programRepo    = new ProgramRepository();
const payoutRepo     = new PayoutRepository();

export class CommissionService {
  /**
   * Create a PENDING commission for an order that has affiliate attribution.
   * Called from order event subscriber on ORDER_COMPLETED.
   * Idempotent — if a commission for this orderId already exists, does nothing.
   */
  async createForOrder(input: {
    orderId:       string;
    affiliateId:   string;
    attributionId: string;
    subtotal:      number;
    grandTotal:    number;
    orderNumber?:  string;
  }): Promise<void> {
    const affiliate = await affiliateRepo.findById(input.affiliateId);
    if (!affiliate) throw new NotFoundError('Affiliate');

    const program = await programRepo.findById(affiliate.programId);
    if (!program) throw new NotFoundError('AffiliateProgram');

    // Determine rate — tiered rates win over defaultRate if thresholds are met
    let rate = program.defaultRate;
    const base = program.commissionBase === 'grand_total' ? input.grandTotal : input.subtotal;
    const baseAmount = fromPaise(toPaise(base));

    const sortedTiers = [...program.tiers].sort((a, b) => b.minOrderAmount - a.minOrderAmount);
    for (const tier of sortedTiers) {
      if (baseAmount >= tier.minOrderAmount) {
        rate = tier.rate;
        break;
      }
    }

    const amount = fromPaise(Math.round((toPaise(baseAmount) * rate) / 100));

    const eligibleForApprovalAt = new Date(
      Date.now() + program.autoApproveAfterDays * 24 * 60 * 60 * 1000
    );

    let commission: Awaited<ReturnType<typeof commissionRepo.create>>;
    try {
      commission = await commissionRepo.create({
        affiliateId:   new mongoose.Types.ObjectId(input.affiliateId),
        orderId:       new mongoose.Types.ObjectId(input.orderId),
        attributionId: new mongoose.Types.ObjectId(input.attributionId),
        snapshotRate:  rate,
        snapshotBase:  program.commissionBase,
        baseAmount,
        amount,
        status:        CommissionStatus.PENDING,
        eligibleForApprovalAt,
      });
    } catch (err: any) {
      // E11000 = duplicate key — another concurrent handler already inserted this commission.
      // Treat as idempotent success rather than re-throwing.
      if (err?.code === 11000 && err?.keyPattern?.orderId) {
        logger.info(`[affiliate] commission already exists for order ${input.orderId} (concurrent insert)`);
        return;
      }
      throw err;
    }

    await commissionRepo.appendEvent({
      commissionId: commission._id,
      affiliateId:  commission.affiliateId,
      eventType:    CommissionEventType.CREATED,
      amountDelta:  amount,
      note:         `Order ${input.orderNumber ?? 'commission'} at ${rate}% on ₹${baseAmount}`,
    });

    // Update affiliate stats
    await affiliateRepo.incrementStats(input.affiliateId, {
      totalOrders:          1,
      totalRevenue:         baseAmount,
      totalCommissionEarned: amount,
    });

    logger.info(`[affiliate] commission ₹${amount} created (PENDING) for order ${input.orderId}, affiliate ${input.affiliateId}`);
  }

  /** Admin: approve a PENDING commission → APPROVED then immediately PAYABLE. */
  async approve(commissionId: string, actorId: string): Promise<void> {
    const commission = await commissionRepo.findById(commissionId);
    if (!commission) throw new NotFoundError('Commission');
    if (commission.status !== CommissionStatus.PENDING) {
      throw new ConflictError(`Commission is ${commission.status}, expected pending`);
    }

    const now = new Date();
    await commissionRepo.claimTransition(commissionId, CommissionStatus.PENDING, CommissionStatus.APPROVED, {
      approvedAt: now,
      actorId:    new mongoose.Types.ObjectId(actorId),
    });
    await commissionRepo.appendEvent({
      commissionId: commission._id,
      affiliateId:  commission.affiliateId,
      eventType:    CommissionEventType.APPROVED,
      amountDelta:  0,
      actorId,
      note:         'Approved by admin',
    });

    // Immediately mark payable
    await commissionRepo.claimTransition(commissionId, CommissionStatus.APPROVED, CommissionStatus.PAYABLE, {
      payableAt: now,
    });
    await commissionRepo.appendEvent({
      commissionId: commission._id,
      affiliateId:  commission.affiliateId,
      eventType:    CommissionEventType.PAYABLE,
      amountDelta:  0,
      actorId,
    });

    logger.info(`[affiliate] commission ${commissionId} approved → payable by ${actorId}`);
  }

  /**
   * Admin: trigger payout for all PAYABLE commissions for an affiliate.
   * For MVP: credits the affiliate's wallet (if they have a userId).
   */
  async payout(affiliateId: string, actorId: string): Promise<{ totalPaid: number; commissionIds: string[] }> {
    const affiliate = await affiliateRepo.findById(affiliateId);
    if (!affiliate) throw new NotFoundError('Affiliate');

    const payable = await commissionRepo.payableByAffiliate(affiliateId);
    if (payable.length === 0) throw new BadRequestError('No payable commissions for this affiliate');

    const now = new Date();

    // Atomically transition each commission PAYABLE → PAID.
    // claimTransition returns null if the commission is no longer PAYABLE
    // (e.g., a concurrent payout request already claimed it). Only count
    // commissions we actually transitioned — this prevents wallet double-credit
    // when two payout requests overlap.
    const transitioned = (
      await Promise.all(
        payable.map(async (c) => {
          const result = await commissionRepo.claimTransition(
            c._id,
            CommissionStatus.PAYABLE,
            CommissionStatus.PAID,
            { paidAt: now, actorId: new mongoose.Types.ObjectId(actorId) }
          );
          if (!result) return null; // already claimed by a concurrent request
          await commissionRepo.appendEvent({
            commissionId: c._id,
            affiliateId:  c.affiliateId,
            eventType:    CommissionEventType.PAID,
            amountDelta:  -c.amount,
            actorId,
          });
          return c;
        })
      )
    ).filter((c): c is NonNullable<typeof c> => c !== null);

    if (transitioned.length === 0) {
      throw new BadRequestError('All commissions were already paid by a concurrent request');
    }

    const totalPaid = fromPaise(transitioned.reduce((sum, commission) => sum + toPaise(commission.amount), 0));
    const commissionIds = transitioned.map((c) => c._id.toString());

    await payoutRepo.create({
      affiliateId: affiliate._id,
      commissionIds: transitioned.map((c) => c._id),
      amount: totalPaid,
      status: 'paid',
      paymentMethod: affiliate.userId ? 'wallet_credit' : affiliate.paymentInfo?.upi ? 'upi' : 'bank_transfer',
      paidAt: now,
      initiatedBy: new mongoose.Types.ObjectId(actorId),
    });

    // If the affiliate has a linked user account, credit their wallet
    if (affiliate.userId) {
      await walletService.credit({
        userId:        affiliate.userId.toString(),
        amount:        totalPaid,
        source:        'affiliate_commission' as any,
        description:   `Affiliate commission payout (${commissionIds.length} orders)`,
        referenceType: 'affiliate',
        referenceId:   affiliateId,
      });
    }

    // Update paid stat
    await affiliateRepo.incrementStats(affiliateId, { totalCommissionPaid: totalPaid });

    logger.info(`[affiliate] payout ₹${totalPaid} processed for affiliate ${affiliateId} (${commissionIds.length} commissions)`);
    return { totalPaid, commissionIds };
  }

  /**
   * Cancel/reverse a commission — called when the underlying order is cancelled or refunded.
   */
  async cancel(orderId: string, reason: string): Promise<void> {
    const commission = await commissionRepo.findByOrderId(orderId);
    if (!commission) return; // no commission for this order — nothing to do

    if ([CommissionStatus.CANCELLED, CommissionStatus.REVERSED].includes(commission.status as any)) {
      logger.info(`[affiliate] commission ${commission._id} already in terminal state ${commission.status}`);
      return;
    }

    const targetStatus = commission.status === CommissionStatus.PAID
      ? CommissionStatus.REVERSED
      : CommissionStatus.CANCELLED;

    await commissionRepo.claimTransition(commission._id, commission.status, targetStatus, {
      cancelledAt:     new Date(),
      cancelledReason: reason,
    });

    await commissionRepo.appendEvent({
      commissionId: commission._id,
      affiliateId:  commission.affiliateId,
      eventType:    targetStatus === CommissionStatus.REVERSED
        ? CommissionEventType.REVERSED
        : CommissionEventType.CANCELLED,
      amountDelta:  -commission.amount,
      note:         reason,
    });

    // Reverse affiliate stats
    await affiliateRepo.incrementStats(commission.affiliateId.toString(), {
      totalCommissionEarned: -commission.amount,
    });

    logger.info(`[affiliate] commission ${commission._id} ${targetStatus}: ${reason}`);
  }

  /**
   * Recalculate an unpaid commission from the cumulative refunded share.
   * Using cumulative values makes duplicate/retried refund events idempotent.
   * Paid commissions are flagged for reconciliation rather than silently
   * debiting an affiliate wallet without a proper negative-balance ledger.
   */
  async adjustForRefund(orderId: string, totalRefunded: number, paymentAmount: number): Promise<void> {
    const commission = await commissionRepo.findByOrderId(orderId);
    if (!commission || paymentAmount <= 0) return;

    const paymentPaise = toPaise(paymentAmount);
    const refundedPaise = Math.min(paymentPaise, Math.max(0, toPaise(totalRefunded)));
    if (refundedPaise >= paymentPaise) {
      await this.cancel(orderId, 'Order payment fully refunded');
      return;
    }

    const desiredBasePaise = proratePaise(
      toPaise(commission.baseAmount),
      paymentPaise - refundedPaise,
      paymentPaise
    );
    const desiredBase = fromPaise(desiredBasePaise);
    const desiredAmount = fromPaise(Math.round((desiredBasePaise * commission.snapshotRate) / 100));
    const delta = fromPaise(toPaise(desiredAmount) - toPaise(commission.amount));
    if (toPaise(delta) === 0) return;

    if (commission.status === CommissionStatus.PAID) {
      await commissionRepo.update(commission._id, {
        metadata: {
          ...(commission.metadata ?? {}),
          refundAdjustmentPending: true,
          totalRefunded,
          paymentAmount,
          desiredAmount,
        },
      });
      logger.error('[affiliate] paid commission requires refund clawback reconciliation', {
        orderId, commissionId: commission.id, currentAmount: commission.amount, desiredAmount,
      });
      return;
    }

    await commissionRepo.update(commission._id, {
      baseAmount: desiredBase,
      amount: desiredAmount,
      metadata: { ...(commission.metadata ?? {}), totalRefunded, paymentAmount },
    });
    await commissionRepo.appendEvent({
      commissionId: commission._id,
      affiliateId: commission.affiliateId,
      eventType: CommissionEventType.ADJUSTED,
      amountDelta: delta,
      note: `Adjusted after cumulative refund of ₹${totalRefunded}`,
    });
    await affiliateRepo.incrementStats(commission.affiliateId, {
      totalRevenue: fromPaise(toPaise(desiredBase) - toPaise(commission.baseAmount)),
      totalCommissionEarned: delta,
    });
  }

  async listForAffiliate(
    affiliateId: string,
    filters?: {
      status?:        string;
      createdAtFrom?: string;
      createdAtTo?:   string;
    }
  ) {
    const filter: FilterQuery<ICommission> = {};

    if (filters?.status) {
      filter.status = filters.status;
    }

    if (filters?.createdAtFrom || filters?.createdAtTo) {
      filter.createdAt = {};
      if (filters.createdAtFrom) filter.createdAt.$gte = new Date(filters.createdAtFrom);
      if (filters.createdAtTo)   filter.createdAt.$lte = new Date(filters.createdAtTo);
    }

    return commissionRepo.findByAffiliate(affiliateId, filter);
  }

  async getWithEvents(commissionId: string) {
    const [commission, events] = await Promise.all([
      commissionRepo.findById(commissionId),
      commissionRepo.events(commissionId),
    ]);
    if (!commission) throw new NotFoundError('Commission');
    return { commission, events };
  }

  async adminList(page: number, limit: number, filters?: { status?: string; affiliateId?: string; createdAtFrom?: string; createdAtTo?: string }) {
    const filter: FilterQuery<ICommission> = {};
    if (filters?.status) filter.status = filters.status;
    if (filters?.affiliateId) filter.affiliateId = filters.affiliateId;
    if (filters?.createdAtFrom || filters?.createdAtTo) {
      filter.createdAt = {};
      if (filters.createdAtFrom) filter.createdAt.$gte = new Date(filters.createdAtFrom);
      if (filters.createdAtTo) filter.createdAt.$lte = new Date(filters.createdAtTo);
    }
    return commissionRepo.paginate(filter, page, limit);
  }

  async bulkApprove(ids: string[], actorId: string) {
    const results = await Promise.allSettled(ids.map((id) => this.approve(id, actorId)));
    return { approved: results.filter((r) => r.status === 'fulfilled').length, failed: results.filter((r) => r.status === 'rejected').length };
  }

  async voidCommission(id: string, reason: string, actorId: string) {
    const commission = await commissionRepo.findById(id);
    if (!commission) throw new NotFoundError('Commission');
    if ([CommissionStatus.CANCELLED, CommissionStatus.REVERSED].includes(commission.status as any)) throw new ConflictError(`Commission is already ${commission.status}`);
    const target = commission.status === CommissionStatus.PAID ? CommissionStatus.REVERSED : CommissionStatus.CANCELLED;
    await commissionRepo.claimTransition(id, commission.status, target, { cancelledAt: new Date(), cancelledReason: reason, actorId: new mongoose.Types.ObjectId(actorId), ...(target === CommissionStatus.REVERSED ? { reversedAt: new Date() } : {}) });
    await commissionRepo.appendEvent({ commissionId: commission._id, affiliateId: commission.affiliateId, eventType: target === CommissionStatus.REVERSED ? CommissionEventType.REVERSED : CommissionEventType.CANCELLED, amountDelta: -commission.amount, actorId, note: reason });
    await affiliateRepo.incrementStats(commission.affiliateId, { totalCommissionEarned: -commission.amount, ...(target === CommissionStatus.REVERSED ? { totalCommissionPaid: -commission.amount } : {}) });
  }

  async adminPayouts(page: number, limit: number, status?: string) { return payoutRepo.paginate(page, limit, status ? { status } : {}); }

  async updatePayout(id: string, input: { status: 'processing' | 'paid' | 'failed'; providerRef?: string; failureReason?: string }) {
    const payout = await payoutRepo.findById(id);
    if (!payout) throw new NotFoundError('Affiliate payout');
    const allowed: Record<string, string[]> = { pending: ['processing', 'paid', 'failed'], processing: ['paid', 'failed'], paid: [], failed: [] };
    if (!allowed[payout.status]?.includes(input.status)) throw new ConflictError(`Payout cannot move from ${payout.status} to ${input.status}`);
    if (input.status === 'paid' && !input.providerRef?.trim()) throw new BadRequestError('providerRef is required when marking a payout paid');
    if (input.status === 'failed' && !input.failureReason?.trim()) throw new BadRequestError('failureReason is required when marking a payout failed');
    return payoutRepo.update(id, { ...input, ...(input.status === 'paid' ? { paidAt: new Date() } : {}), ...(input.status === 'failed' ? { failedAt: new Date() } : {}) });
  }

  async adminStats() {
    return commissionRepo.adminStats();
  }
}

export const commissionService = new CommissionService();
