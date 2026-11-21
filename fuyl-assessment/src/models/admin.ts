import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const model = <T>(name: string, schema: Schema): Model<T> =>
  (mongoose.models[name] as Model<T>) ?? mongoose.model<T>(name, schema);

// ─── Admin users ────────────────────────────────────────────────────────────

const AdminUserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true },
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

export const AdminUser = model<AdminUserDoc>("AdminUser", AdminUserSchema);
export const KbDraft = model<KbDraftDoc>("KbDraft", KbDraftSchema);
export const KbVersion = model<KbVersionDoc>("KbVersion", KbVersionSchema);
export const AuditLog = model<AuditLogDoc>("AuditLog", AuditLogSchema);
