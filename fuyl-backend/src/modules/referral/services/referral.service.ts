import { ReferralRepository } from '../repositories/referral.repository';
import { CodeRepository } from '../repositories/code.repository';
import { CampaignRepository } from '../repositories/campaign.repository';
import { FraudFlagRepository } from '../repositories/fraudFlag.repository';
import { RewardRepository } from '../repositories/reward.repository';
import { FraudService } from './fraud.service';
import { RewardService } from './reward.service';
import { ApplyCodeInput } from '../interfaces';
import { ReferralStatus } from '../../../shared/enums';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
} from '../../../shared/errors';
import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { logger } from '../../../config/logger';
import mongoose from 'mongoose';

const referralRepo = new ReferralRepository();
const codeRepo = new CodeRepository();
const campaignRepo = new CampaignRepository();
const fraudFlagRepo = new FraudFlagRepository();
const rewardRepo = new RewardRepository();
const fraudService = new FraudService();
const rewardService = new RewardService();

export class ReferralService {
  /**
   * Apply a referral code at signup or checkout.
   * Creates a referral record in 'applied' (or 'pending') status.
   */
  async applyCode(input: ApplyCodeInput) {
    const code = await codeRepo.findByCode(input.code);
    if (!code) throw new NotFoundError('Referral code');
    if (!code.isActive) throw new ConflictError('Referral code inactive');
    if (code.expiresAt && code.expiresAt < new Date()) throw new ConflictError('Referral code expired');
    if (code.maxUses > 0 && code.usesCount >= code.maxUses) throw new ConflictError('Referral code max uses reached');

    if (code.referrerId.toString() === input.refereeId) {
      throw new BadRequestError('Cannot use own referral code');
    }

    // Existing referral for this referee?
    const existing = await referralRepo.findByReferee(input.refereeId);
    if (existing && existing.status !== ReferralStatus.SHARED && existing.status !== ReferralStatus.REJECTED) {
      throw new ConflictError('Referee already has an active referral');
    }

    const campaign = code.campaignId
      ? await campaignRepo.findById(code.campaignId.toString())
      : await campaignRepo.findActive();

    // Create the referral record
    const referral = await referralRepo.create({
      referrerId: code.referrerId,
      refereeId: new mongoose.Types.ObjectId(input.refereeId),
      code: code.code,
      campaignId: campaign?._id,
      status: ReferralStatus.APPLIED,
      appliedAt: new Date(),
      metadata: {
        deviceFingerprint: input.deviceFingerprint,
        ipHash: input.ipHash,
        phoneHash: input.phoneHash,
        upiHandle: input.upiHandle,
      },
    });

    // Fraud check
    const fraud = await fraudService.check({
      referrerId: code.referrerId.toString(),
      refereeId: input.refereeId,
      referralId: referral._id.toString(),
      deviceFingerprint: input.deviceFingerprint,
      ipHash: input.ipHash,
      phoneHash: input.phoneHash,
      upiHandle: input.upiHandle,
    });

    if (fraud.isFraud && fraud.severity === 'high') {
      await referralRepo.markStatus(referral._id, ReferralStatus.REJECTED, {
        rejectedAt: new Date(),
        rejectedReason: `Fraud: ${fraud.reasons.join(', ')}`,
      });
      eventBus.publish(Events.REFERRAL_FLAGGED, {
        referralId: referral.id,
        reasons: fraud.reasons,
        severity: fraud.severity,
      });
      throw new ForbiddenError('Referral rejected due to fraud signals');
    }

    await codeRepo.incrementUses(code.code);
    eventBus.publish(Events.REFERRAL_APPLIED, { referralId: referral.id, refereeId: input.refereeId });
    return referral;
  }

  /**
   * Called when a referee signs up — promote applied → pending.
   */
  async onUserRegistered(event: { userId: string; appliedReferralCode?: string }) {
    if (!event.appliedReferralCode) return;
    const referral = await referralRepo.findByReferee(event.userId);
    if (!referral) return;
    await referralRepo.markStatus(referral._id, ReferralStatus.PENDING, {
      signupAt: new Date(),
    });
  }

  /**
   * Called when a referee places their first order — set firstOrderId + firstOrderAt.
   * Reward is NOT yet granted (depends on campaign.rewardTrigger).
   */
  async onOrderPlaced(event: { orderId: string; userId: string }) {
    const referral = await referralRepo.findPendingByReferee(event.userId);
    if (!referral) return;
    await referralRepo.update(referral._id, {
      firstOrderId: new mongoose.Types.ObjectId(event.orderId),
      firstOrderAt: new Date(),
    });

    const campaign = referral.campaignId
      ? await campaignRepo.findById(referral.campaignId.toString())
      : await campaignRepo.findActive();

    if (campaign?.rewardTrigger === 'order_placed') {
      await this.markEligibleAndReward(referral._id.toString());
    }
  }

  /**
   * Called when a referee's first order is completed — default reward trigger.
   */
  async onOrderCompleted(event: { orderId: string; userId: string }) {
    const referral = await referralRepo.findPendingByReferee(event.userId);
    if (!referral) return;

    // Confirm this is the referee's first order
    if (referral.firstOrderId?.toString() !== event.orderId) {
      // Update if needed
      await referralRepo.update(referral._id, {
        firstOrderId: new mongoose.Types.ObjectId(event.orderId),
        firstOrderAt: new Date(),
      });
    }

    const campaign = referral.campaignId
      ? await campaignRepo.findById(referral.campaignId.toString())
      : await campaignRepo.findActive();

    if (!campaign || campaign.rewardTrigger !== 'order_completed') return;

    await this.markEligibleAndReward(referral._id.toString());
  }

  async onOrderCancelled(event: { orderId: string; userId: string }) {
    const referral = await referralRepo.findByReferee(event.userId);
    if (!referral) return;
    if (referral.firstOrderId?.toString() !== event.orderId) return;

    // If already rewarded → reverse the rewards
    if (referral.status === ReferralStatus.REWARDED || referral.status === ReferralStatus.COMPLETED) {
      const rewards = await rewardRepo.findByReferral(referral._id.toString());
      for (const r of rewards) {
        await rewardService.reverse(r._id.toString(), 'Order cancelled');
      }
      await referralRepo.markStatus(referral._id, ReferralStatus.REJECTED, {
        rejectedAt: new Date(),
        rejectedReason: 'Referee order cancelled',
      });
      eventBus.publish(Events.REFERRAL_REJECTED, { referralId: referral.id, reason: 'order_cancelled' });
    }
  }

  private async markEligibleAndReward(referralId: string) {
    const referral = await referralRepo.findById(referralId);
    if (!referral) return;
    if (referral.status === ReferralStatus.REWARDED || referral.status === ReferralStatus.COMPLETED) return;

    await referralRepo.markStatus(referral._id, ReferralStatus.ELIGIBLE, { eligibleAt: new Date() });
    eventBus.publish(Events.REFERRAL_ELIGIBLE, { referralId });

    // Re-run fraud check
    const meta = (referral.metadata ?? {}) as Record<string, string | undefined>;
    const fraud = await fraudService.check({
      referrerId: referral.referrerId.toString(),
      refereeId: referral.refereeId.toString(),
      referralId,
      deviceFingerprint: meta.deviceFingerprint,
      ipHash: meta.ipHash,
      phoneHash: meta.phoneHash,
      upiHandle: meta.upiHandle,
    });

    if (fraud.isFraud && fraud.severity === 'high') {
      await referralRepo.markStatus(referral._id, ReferralStatus.REJECTED, {
        rejectedAt: new Date(),
        rejectedReason: `Fraud: ${fraud.reasons.join(', ')}`,
      });
      eventBus.publish(Events.REFERRAL_REJECTED, { referralId, reason: 'fraud' });
      return;
    }

    await rewardService.grant(referralId);
  }

  /**
   * Customer dashboard data.
   */
  async getMyDashboard(userId: string) {
    const [myCode, referrals, totalEarned, totalReferrals, totalRewarded] = await Promise.all([
      codeRepo.findActiveByReferrer(userId),
      referralRepo.findByReferrer(userId),
      rewardRepo.totalEarnedByUser(userId),
      referralRepo.countByReferrer(userId),
      referralRepo.countByReferrer(userId, ReferralStatus.REWARDED),
    ]);

    return {
      code: myCode?.code,
      shareLink: myCode ? `${process.env.CLIENT_URL ?? 'http://localhost:3000'}/ref/${myCode.code}` : null,
      stats: {
        totalReferrals,
        totalRewarded,
        totalEarned,
        pending: referrals.filter(r => r.status === ReferralStatus.PENDING || r.status === ReferralStatus.ELIGIBLE).length,
      },
      recent: referrals.slice(0, 10),
    };
  }

  async listMyReferrals(userId: string) {
    return referralRepo.findByReferrer(userId);
  }

  async listMyRewards(userId: string) {
    return rewardRepo.findByUser(userId, { isReversed: false });
  }
}

export const referralService = new ReferralService();
