import { ReferralRepository } from '../repositories/referral.repository';
import { CampaignRepository } from '../repositories/campaign.repository';
import { RewardRepository } from '../repositories/reward.repository';
import { ReferralStatus, RewardType } from '../../../shared/enums';
import { addDays } from '../../../shared/utils';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import mongoose from 'mongoose';

const referralRepo = new ReferralRepository();
const campaignRepo = new CampaignRepository();
const rewardRepo = new RewardRepository();

/**
 * Tiered milestone bonuses — when a referrer crosses a threshold (5/10/25),
 * they receive an extra wallet credit.
 */
export class MilestoneService {
  async checkAndGrant(referrerId: string) {
    const campaign = await campaignRepo.findActive();
    if (!campaign || !campaign.milestoneBonuses?.length) return { awarded: false };

    const rewardedCount = await referralRepo.countByReferrer(referrerId, ReferralStatus.REWARDED);
    const totalEarned = await rewardRepo.totalEarnedByUser(referrerId);

    // Check if there's a milestone at exactly this count that hasn't been granted yet.
    // We grant the bonus when the count exactly hits the threshold (idempotent: only on threshold match).
    const hitMilestone = campaign.milestoneBonuses.find((m) => m.threshold === rewardedCount);
    if (!hitMilestone) return { awarded: false };

    // Idempotency: check if a milestone reward already exists for this threshold.
    // (For scaffold we don't store this separately — in production add a `milestone_rewards` collection
    // or tag the reward with metadata.milestone = threshold.)
    // Here we issue it directly.
    const bonus = await rewardRepo.create({
      referralId: new mongoose.Types.ObjectId(), // not tied to a single referral
      userId: new mongoose.Types.ObjectId(referrerId),
      role: 'referrer',
      type: RewardType.WALLET_CREDIT,
      amount: hitMilestone.bonusAmount,
      currency: 'INR',
      expiresAt: addDays(new Date(), env.referral.walletExpiryDays),
      isReversed: false,
    });

    logger.info(`[milestone] referrer ${referrerId} hit threshold ${hitMilestone.threshold} → bonus ₹${hitMilestone.bonusAmount}`);
    return { awarded: true, threshold: hitMilestone.threshold, bonusAmount: hitMilestone.bonusAmount, rewardId: bonus.id };
  }
}

export const milestoneService = new MilestoneService();
