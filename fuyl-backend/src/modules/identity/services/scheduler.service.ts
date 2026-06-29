import { schedule } from '../../../config/scheduler';
import { RefreshTokenRepository } from '../repositories/refreshToken.repository';
import { logger } from '../../../config/logger';

const refreshRepo = new RefreshTokenRepository();

export function registerIdentitySchedulers(): void {
  schedule('identity.tokenCleanup', '0 6 * * *', async () => {
    logger.info('[scheduler] identity.tokenCleanup tick');
    const n = await refreshRepo.cleanupExpired();
    logger.info(`[scheduler] identity.tokenCleanup removed ${n} expired tokens`);
  });
}
