import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { TooManyRequestsError } from '../../../shared/errors';
import { Response, NextFunction } from 'express';
import { cacheService } from '../../../shared/services/cache.service';

/**
 * Rate limit: max 5 referral-code applications per IP per hour.
 * Implemented via Redis (more accurate than express-rate-limit for distributed workers).
 */
export async function referralApplyRateLimit(req: AuthedRequest, res: Response, next: NextFunction) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] ?? req.socket.remoteAddress ?? 'unknown';
  const key = `rl:referral:apply:${ip}`;
  const count = await cacheService.incr(key, 60 * 60); // 1 hour TTL
  if (count > 5) {
    return next(new TooManyRequestsError('Too many referral applications from this IP'));
  }
  next();
}
