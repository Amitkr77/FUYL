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
  apiPrefix: process.env.API_PREFIX ?? '/api/v1',
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:3000',

  mongo: {
    uri: required('MONGODB_URI', 'mongodb://localhost:27017/fuyl'),
  },

  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB ?? '0', 10),
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

  referral: {
    defaultReferrerReward: parseInt(process.env.DEFAULT_REFERRER_REWARD ?? '100', 10),
    defaultRefereeReward: parseInt(process.env.DEFAULT_REFEREE_REWARD ?? '50', 10),
    codeExpiryDays: parseInt(process.env.DEFAULT_REFERRAL_CODE_EXPIRY_DAYS ?? '90', 10),
    walletExpiryDays: parseInt(process.env.DEFAULT_WALLET_EXPIRY_DAYS ?? '90', 10),
  },

  subscription: {
    reminderDays: parseInt(process.env.DEFAULT_SUBSCRIPTION_REMINDER_DAYS ?? '3', 10),
    dunningMaxRetries: parseInt(process.env.DEFAULT_DUNING_MAX_RETRIES ?? '3', 10),
    dunningRetryIntervalHours: parseInt(process.env.DEFAULT_DUNING_RETRY_INTERVAL_HOURS ?? '24', 10),
  },
} as const;

export type AppEnv = typeof env;
