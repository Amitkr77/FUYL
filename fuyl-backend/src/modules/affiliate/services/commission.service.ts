import { CommissionRepository } from '../repositories/commission.repository';
import { AffiliateRepository } from '../repositories/affiliate.repository';
import { ProgramRepository } from '../repositories/program.repository';
import { CommissionStatus, CommissionEventType } from '../../../shared/enums';
import { NotFoundError, ConflictError, BadRequestError } from '../../../shared/errors';
import { walletService } from '../../wallet/services/wallet.service';
import { logger } from '../../../config/logger';
import mongoose from 'mongoose';

const commissionRepo = new CommissionRepository();
const affiliateRepo  = new AffiliateRepository();
const programRepo    = new ProgramRepository();

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
  }): Promise<void> {
    const affiliate = await affiliateRepo.findById(input.affiliateId);
    if (!affiliate) throw new NotFoundError('Affiliate');

    const program = await programRepo.findById(affiliate.programId);
    if (!program) throw new NotFoundError('AffiliateProgram');

    // Determine rate — tiered rates win over defaultRate if thresholds are met
    let rate = program.defaultRate;
    const base = program.commissionBase === 'grand_total' ? input.grandTotal : input.subtotal;
    const baseAmount = base;

    const sortedTiers = [...program.tiers].sort((a, b) => b.minOrderAmount - a.minOrderAmount);
    for (const tier of sortedTiers) {
      if (baseAmount >= tier.minOrderAmount) {
        rate = tier.rate;
        break;
      }
    }

    const amount = Math.round((baseAmount * rate) / 100 * 100) / 100;

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
      note:         `Order ${input.orderId} at ${rate}% on ₹${baseAmount}`,
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

    const totalPaid = transitioned.reduce((sum, c) => sum + c.amount, 0);
    const commissionIds = transitioned.map((c) => c._id.toString());

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

    if ([CommissionStatus.PAID, CommissionStatus.CANCELLED, CommissionStatus.REVERSED].includes(commission.status as any)) {
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

  async listForAffiliate(affiliateId: string, status?: string) {
    const filter = status ? { status } : {};
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

  async adminList(page: number, limit: number, status?: string) {
    const filter = status ? { status } : {};
    return commissionRepo.paginate(filter, page, limit);
  }

  async adminStats() {
    return commissionRepo.adminStats();
  }
}

export const commissionService = new CommissionService();
