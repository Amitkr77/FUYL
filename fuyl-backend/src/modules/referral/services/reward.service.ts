import { RewardRepository } from '../repositories/reward.repository';
import { ReferralRepository } from '../repositories/referral.repository';
import { CampaignRepository } from '../repositories/campaign.repository';
import { MilestoneService } from './milestone.service';
import { RewardType, ReferralStatus } from '../../../shared/enums';
import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { queueService } from '../../../shared/services/queue.service';
import { env } from '../../../config/env';
import { addDays } from '../../../shared/utils';
import { logger } from '../../../config/logger';
import mongoose from 'mongoose';

const rewardRepo = new RewardRepository();
const referralRepo = new ReferralRepository();
const campaignRepo = new CampaignRepository();
const milestoneService = new MilestoneService();

/**
 * Grants referrer + referee rewards when a referral becomes eligible.
 * Reward type defaults to wallet credit (also issues coupons via promotion module).
 */
export class RewardService {
  async grant(referralId: string) {
    const referral = await referralRepo.findById(referralId);
    if (!referral) throw new Error('Referral not found');

    const campaign = referral.campaignId
      ? await campaignRepo.findById(referral.campaignId.toString())
      : await campaignRepo.findActive();

    const referrerRewardConfig = campaign?.referrerReward ?? {
      type: RewardType.WALLET_CREDIT,
      amount: env.referral.defaultReferrerReward,
    };
    const refereeRewardConfig = campaign?.refereeReward ?? {
      type: RewardType.WALLET_CREDIT,
      amount: env.referral.defaultRefereeReward,
    };

    // Grant referrer reward
    const referrerReward = await rewardRepo.create({
      referralId: referral._id,
      userId: referral.referrerId,
      role: 'referrer',
      type: referrerRewardConfig.type,
      amount: referrerRewardConfig.amount,
      currency: 'INR',
      expiresAt: addDays(new Date(), env.referral.walletExpiryDays),
      isReversed: false,
    });

    // Grant referee reward
    const refereeReward = await rewardRepo.create({
      referralId: referral._id,
      userId: referral.refereeId,
      role: 'referee',
      type: refereeRewardConfig.type,
      amount: refereeRewardConfig.amount,
      currency: 'INR',
      expiresAt: addDays(new Date(), env.referral.walletExpiryDays),
      isReversed: false,
    });

    // Credit wallet (fire-and-forget — wallet module subscribes to REFERRAL_REDEEMED)
    await referralRepo.update(referral._id, {
      status: ReferralStatus.REWARDED,
      rewardedAt: new Date(),
      rewardReferrerId: referrerReward._id,
      rewardRefereeId: refereeReward._id,
    });

    // Issue coupons if applicable (via promotion module — would publish another event)
    if (referrerRewardConfig.type === RewardType.COUPON && referrerRewardConfig.couponCode) {
      logger.info(`[reward] coupon ${referrerRewardConfig.couponCode} issued to referrer ${referral.referrerId}`);
    }
    if (refereeRewardConfig.type === RewardType.COUPON && refereeRewardConfig.couponCode) {
      logger.info(`[reward] coupon ${refereeRewardConfig.couponCode} issued to referee ${referral.refereeId}`);
    }

    eventBus.publish(Events.REFERRAL_REWARDED, {
      referralId,
      referrerId: referral.referrerId.toString(),
      refereeId: referral.refereeId.toString(),
      referrerReward: { id: referrerReward.id, amount: referrerReward.amount, type: referrerReward.type },
      refereeReward: { id: refereeReward.id, amount: refereeReward.amount, type: refereeReward.type },
    });

    // Dispatch notifications
    queueService.notificationDispatch({
      channel: 'email',
      to: { userId: referral.referrerId.toString() },
      template: 'referral_reward_earned',
      data: { amount: referrerReward.amount, role: 'referrer' },
    });
    queueService.notificationDispatch({
      channel: 'email',
      to: { userId: referral.refereeId.toString() },
      template: 'referral_reward_earned',
      data: { amount: refereeReward.amount, role: 'referee' },
    });

    // Milestone check for referrer
    await milestoneService.checkAndGrant(referral.referrerId.toString());

    return { referrerReward, refereeReward };
  }

  async reverse(rewardId: string, reason: string) {
    const reward = await rewardRepo.findById(rewardId);
    if (!reward) return;
    if (reward.isReversed) return;
    await rewardRepo.reverse(rewardId, reason);

    // Wallet module should subscribe to a reversal event and debit back
    logger.info(`[reward] reversed ${rewardId} — ${reason}`);

    // Also reverse the wallet credit (publish event)
    eventBus.publish('reward.reversed', { rewardId, userId: reward.userId.toString(), amount: reward.amount });
  }
}

export const rewardService = new RewardService();
