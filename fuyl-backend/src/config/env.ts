import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function required(key: string, fallback?: string): string {
  const v = process.env[key] ?? fallback;
  if (v === undefined) {
    throw new Error(`[env] Missing required env var: ${key}`);
  }
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  isDev: process.env.NODE_ENV !== 'production',
  port: parseInt(process.env.PORT ?? '4000', 10),
  appName: process.env.APP_NAME ?? 'Fuyl Backend',
  // Every consumer of this value templates it as `/${env.apiPrefix}` (app.ts,
  // server.ts) — normalizing away any leading slash here, regardless of how
  // API_PREFIX is set, guarantees exactly one slash instead of the double
  // slash that resulted when API_PREFIX (default and .env) already included
  // one. This was a live bug: the real API was only reachable at
  // "//api/v1/..." — confirmed by booting the server and testing directly.
  apiPrefix: (process.env.API_PREFIX ?? '/api/v1').replace(/^\/+/, ''),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:3000',
  // Matches fuyl-frontend's REVALIDATE_SECRET — used to call its
  // POST /api/revalidate route on-demand after catalog/content mutations,
  // instead of waiting out that page's ISR `revalidate` window (up to
  // 3600s for some product routes). That route handler already existed
  // ("Called by the Node backend whenever products/content are updated")
  // but nothing in this backend ever actually called it.
  revalidateSecret: process.env.REVALIDATE_SECRET ?? '',
  // CORS allow-list: storefront + admin dashboard origins. Explicit CORS_ORIGINS
  // (comma-separated) wins in prod; local dev defaults cover both frontend apps.
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : [process.env.CLIENT_URL ?? 'http://localhost:3000', 'http://localhost:3001'],

  mongo: {
    uri: required('MONGODB_URI', 'mongodb://localhost:27017/fuyl'),
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    username: process.env.REDIS_USERNAME || undefined,
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB ?? '0', 10),
    tls: process.env.REDIS_TLS === 'true',
  },

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev_access_secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret'),
    accessExpiry: process.env.JWT_ACCESS_EXPIRY ?? '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY ?? '7d',
    cookieName: process.env.JWT_COOKIE_NAME ?? 'fuyl_refresh',
  },

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? '',
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
  },

  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'no-reply@fuyl.com',
  },

  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? '',
    authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
    from: process.env.TWILIO_FROM ?? '',
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID ?? '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? '',
    // .env files can't hold real newlines — service-account keys are
    // exported with literal "\n" sequences that need converting back.
    privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
  },

  referral: {
    defaultReferrerReward: parseInt(process.env.DEFAULT_REFERRER_REWARD ?? '100', 10),
    defaultRefereeReward: parseInt(process.env.DEFAULT_REFEREE_REWARD ?? '50', 10),
    codeExpiryDays: parseInt(process.env.DEFAULT_REFERRAL_CODE_EXPIRY_DAYS ?? '90', 10),
    walletExpiryDays: parseInt(process.env.DEFAULT_WALLET_EXPIRY_DAYS ?? '90', 10),
  },

  instagram: {
    // Long-lived Instagram User Access Token from "Instagram API with
    // Instagram Login" (business/creator account required). Get one via
    // https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
    // — no token means the homepage feed just falls back to placeholders.
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN ?? '',
  },

  subscription: {
    reminderDays: parseInt(process.env.DEFAULT_SUBSCRIPTION_REMINDER_DAYS ?? '3', 10),
    dunningMaxRetries: parseInt(process.env.DEFAULT_DUNING_MAX_RETRIES ?? '3', 10),
    dunningRetryIntervalHours: parseInt(process.env.DEFAULT_DUNING_RETRY_INTERVAL_HOURS ?? '24', 10),
  },
} as const;

export type AppEnv = typeof env;
