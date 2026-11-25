import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const model = <T>(name: string, schema: Schema): Model<T> =>
  // Untyped call + cast: the generic form sends newer mongoose typings into runaway recursion.
  (mongoose.models[name] ?? mongoose.model(name, schema)) as unknown as Model<T>;

// ─── Admin users ────────────────────────────────────────────────────────────

const AdminUserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    /** Only demo accounts have a password; real accounts sign in with an emailed one-time code. */
    passwordHash: { type: String },
    role: { type: String, enum: ["admin", "reviewer"], required: true },
    active: { type: Boolean, default: true },
    /** Bumped on password change / deactivation to invalidate existing sessions. */
    sessionVersion: { type: Number, default: 1 },
    failedLogins: { type: Number, default: 0 },
    lockedUntil: Date,
    lastLoginAt: Date,
  },
  { timestamps: true, collection: "admin_users" },
);

// ─── Knowledge base: one editable draft + immutable published versions ─────

const KbDraftSchema = new Schema(
  {
    _id: { type: String, default: "draft" },
    kb: { type: Schema.Types.Mixed, required: true },
    /** "type:key" → { status, by, at } */
    reviews: { type: Schema.Types.Mixed, default: {} },
    basedOnVersion: { type: Number, default: 0 },
    updatedBy: String,
  },
  { timestamps: true, collection: "kb_draft", minimize: false },
);

const KbVersionSchema = new Schema(
  {
    version: { type: Number, required: true, unique: true },
    kb: { type: Schema.Types.Mixed, required: true },
    reviews: { type: Schema.Types.Mixed, default: {} },
    note: String,
    publishedBy: String,
    publishedAt: { type: Date, default: () => new Date() },
  },
  { collection: "kb_versions", minimize: false },
);

// ─── One-time sign-in codes ────────────────────────────────────────────────

const AdminOtpSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, index: true },
    /** HMAC of the code — the code itself is never stored. */
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    createdAt: { type: Date, default: () => new Date() },
    expiresAt: { type: Date, required: true },
  },
  { collection: "admin_otps" },
);
// MongoDB deletes codes automatically once they expire.
AdminOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// "Newest code for this email" lookups.
AdminOtpSchema.index({ email: 1, createdAt: -1 });

/**
 * Code-request throttle per email address — kept separately from the codes so
 * using or voiding a code never resets it, and recorded for unknown emails too
 * so the throttle can't reveal which addresses have accounts.
 */
const AdminOtpRequestSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    lastAt: { type: Date, required: true },
    windowStart: { type: Date, required: true },
    count: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { collection: "admin_otp_requests" },
);
AdminOtpRequestSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ─── Audit log ──────────────────────────────────────────────────────────────

const AuditLogSchema = new Schema(
  {
    at: { type: Date, default: () => new Date(), index: true },
    actor: String, // email
    action: { type: String, required: true },
    target: String,
    details: Schema.Types.Mixed,
  },
  { collection: "audit_log" },
);

export type AdminUserDoc = InferSchemaType<typeof AdminUserSchema>;
export type KbDraftDoc = InferSchemaType<typeof KbDraftSchema>;
export type KbVersionDoc = InferSchemaType<typeof KbVersionSchema>;
export type AuditLogDoc = InferSchemaType<typeof AuditLogSchema>;
export type AdminOtpDoc = InferSchemaType<typeof AdminOtpSchema>;

export const AdminUser = model<AdminUserDoc>("AdminUser", AdminUserSchema);
export const KbDraft = model<KbDraftDoc>("KbDraft", KbDraftSchema);
export const KbVersion = model<KbVersionDoc>("KbVersion", KbVersionSchema);
export const AuditLog = model<AuditLogDoc>("AuditLog", AuditLogSchema);
export const AdminOtp = model<AdminOtpDoc>("AdminOtp", AdminOtpSchema);
export const AdminOtpRequest = model<InferSchemaType<typeof AdminOtpRequestSchema>>("AdminOtpRequest", AdminOtpRequestSchema);

// ─── App settings (key → value) ────────────────────────────────────────────

/** Small runtime settings edited in /admin that apply without a KB publish (e.g. the Assisted assessment). */
const AppSettingSchema = new Schema(
  {
    _id: { type: String, required: true },
    value: { type: Schema.Types.Mixed, required: true },
    updatedBy: String,
  },
  { timestamps: true, collection: "app_settings", minimize: false },
);

/** AI usage per UTC day — enforces the daily AI request cap and feeds the admin dashboard. */
const AiUsageSchema = new Schema(
  {
    _id: { type: String, required: true }, // YYYY-MM-DD
    calls: { type: Number, default: 0 },
    failures: { type: Number, default: 0 },
    /** Turns answered by the built-in understanding because AI was unavailable / over the cap. */
    fallbacks: { type: Number, default: 0 },
    promptTokens: { type: Number, default: 0 },
    completionTokens: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { collection: "ai_usage" },
);
AiUsageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const AppSetting = model<InferSchemaType<typeof AppSettingSchema>>("AppSetting", AppSettingSchema);
export const AiUsage = model<InferSchemaType<typeof AiUsageSchema>>("AiUsage", AiUsageSchema);

// ─── Shared rate-limit counters ────────────────────────────────────────────

/** One counter per key per fixed window, shared by every server instance; MongoDB deletes them when the window ends. */
const RateBucketSchema = new Schema(
  {
    _id: { type: String, required: true }, // `${key}|${windowStart}`
    count: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { collection: "rate_buckets", versionKey: false },
);
RateBucketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RateBucket = model<InferSchemaType<typeof RateBucketSchema>>("RateBucket", RateBucketSchema);
