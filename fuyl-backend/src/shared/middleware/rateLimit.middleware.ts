import rateLimit from "express-rate-limit";
import { env } from "../../config/env";

// Rate limiters use the built-in in-memory MemoryStore (per process).
// We run a single Render instance so cross-process sharing is not needed,
// and dropping the Redis-backed store removes ~4 Redis round-trips per
// API request — the single biggest driver of Upstash request usage.

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProd ? 300 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "TOO_MANY_REQUESTS", message: "Too many requests" },
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_AUTH_ATTEMPTS",
      message: "Too many auth attempts",
    },
  },
});

export const newsletterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many newsletter requests. Please try again later.",
    },
  },
});

export const referralApplyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REFERRAL_ATTEMPTS",
      message: "Too many referral applications",
    },
  },
});
