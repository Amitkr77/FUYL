import { schedule, Schedules } from '../../../config/scheduler';
import { fraudService } from './fraud.service';
import { ReferralRepository } from '../repositories/referral.repository';
import { ReferralStatus } from '../../../shared/enums';
import { logger } from '../../../config/logger';
import { env } from '../../../config/env';
import { addDays } from '../../../shared/utils';

const referralRepo = new ReferralRepository();

/**
 * Registers all referral-related cron jobs.
 * Called once from src/server.ts at boot.
 */
export function registerReferralSchedulers(): void {
  schedule('referral.fraudScan', Schedules.REFERRAL_FRAUD_SCAN, async () => {
    logger.info('[scheduler] referral.fraudScan tick');
    const res = await fraudService.scanNightly();
    logger.info(`[scheduler] referral.fraudScan result`, res);
  });

  schedule('referral.expirySweeper', Schedules.REFERRAL_EXPIRY_SWEEPER, async () => {
    logger.info('[scheduler] referral.expirySweeper tick');
    const cutoff = addDays(new Date(), -env.referral.codeExpiryDays);
    const expired = await referralRepo.findExpiredPending(cutoff, 500);
    let swept = 0;
    for (const r of expired) {
      await referralRepo.markStatus(r._id, ReferralStatus.REJECTED, {
        rejectedAt: new Date(),
        rejectedReason: 'Referral expired (referee did not complete qualifying action in time)',
      });
      swept++;
    }
    logger.info(`[scheduler] referral.expirySweeper swept ${swept} referrals`);
  });
}
