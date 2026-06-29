import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProd ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests' } },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_AUTH_ATTEMPTS', message: 'Too many auth attempts' } },
});

export const referralApplyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'TOO_MANY_REFERRAL_ATTEMPTS', message: 'Too many referral applications' } },
});
