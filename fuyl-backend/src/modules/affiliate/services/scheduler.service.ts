import { schedule } from '../../../config/scheduler';
import { logger } from '../../../config/logger';
import { commissionService } from './commission.service';

export function registerAffiliateSchedulers(): void {
  schedule('affiliate.autoApproveCommissions', '15 * * * *', async () => {
    const approved = await commissionService.autoApproveEligible();
    if (approved) logger.info(`[affiliate.scheduler] automatically approved ${approved} commissions`);
  });
}
