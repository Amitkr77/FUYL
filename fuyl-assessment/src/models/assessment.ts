import "server-only";
import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * An in-progress assessment. The browser holds a random session id in an
 * httpOnly cookie; only its SHA-256 hash is stored here (`_id`). Unfinished
 * sessions expire after 30 days.
 */
const SessionSchema = new Schema(
  {
    _id: { type: String, required: true }, // sha256(session id)
    answers: { type: Schema.Types.Mixed, default: {} },
    /** Question keys in the order they were answered (drives Back). */
    path: { type: [String], default: [] },
    status: { type: String, enum: ["active", "stopped", "complete", "submitted"], default: "active" },
    stoppedRule: String,
    kbVersion: Number,
    consent: { at: Date, version: String },
    utm: { source: String, medium: String, campaign: String, content: String, term: String },
    startedAt: { type: Date, default: () => new Date() },
    completedAt: Date,
    submittedAt: Date,
    /** Result link token (raw). Server-side only; as secret as the session itself. */
    resultToken: String,
    /** "standard" = the one-question-per-screen quiz; "assisted" = the chat. */
    mode: { type: String, enum: ["standard", "assisted"], default: "standard" },
    /** Assisted only: email asked up front (the report goes here at the end). */
    email: { type: String, lowercase: true, trim: true },
    /**
     * Extra browser ids for this session (sha256), added when someone opens a
     * "continue where you left off" link on another device or browser.
     */
    altSids: { type: [String], default: undefined },
    /** sha256 of the token in the "continue" link we emailed (null until one is sent). */
    resumeTokenHash: String,
    /** When the one "your answers are saved" reminder was sent. */
    reminderSentAt: Date,
    /** Bot speed check: last answer time and how many answers in a row came in faster than a person can tap. */
    lastAnswerAt: Date,
    fastStreak: { type: Number, default: 0 },
    /** Assisted only: settings snapshot, transcript and the question the chat is waiting on. */
    chat: {
      settings: Schema.Types.Mixed,
      messages: { type: [Schema.Types.Mixed], default: undefined },
      askKey: String,
      userTurns: { type: Number, default: 0 },
      aiTurns: { type: Number, default: 0 },
      fallbackTurns: { type: Number, default: 0 },
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: "sessions", minimize: false },
);
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Admin transcript list and per-email start limit.
SessionSchema.index({ mode: 1, createdAt: -1 });
SessionSchema.index({ email: 1, createdAt: -1 });
SessionSchema.index({ altSids: 1 }, { sparse: true });
SessionSchema.index({ resumeTokenHash: 1 }, { sparse: true });
// Reminder sweep: unfinished assisted sessions that have gone quiet.
SessionSchema.index({ status: 1, reminderSentAt: 1, updatedAt: 1 });

/**
 * A finished assessment, unlocked with an email. The result link token is
 * stored only as a hash. Deleted automatically after 12 months.
 */
const SubmissionSchema = new Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    sessionId: { type: String, index: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    firstName: String,
    newsletterOptIn: { type: Boolean, default: false },
    consent: { at: Date, version: String },
    answers: { type: Schema.Types.Mixed, required: true },
    path: { type: [String], default: [] },
    result: { type: Schema.Types.Mixed, required: true },
    product: { type: Schema.Types.Mixed },
    kbVersion: Number,
    utm: { source: String, medium: String, campaign: String, content: String, term: String },
    mode: { type: String, enum: ["standard", "assisted"], default: "standard" },
    /** pending → sent | logged (no SMTP) | failed | limited (per-recipient cap reached) */
    email_status: { type: String, enum: ["pending", "sent", "logged", "failed", "limited"], default: "pending" },
    email_error: String,
    ctaClickedAt: Date,
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: "submissions", minimize: false },
);
SubmissionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SubmissionSchema.index({ createdAt: -1 });
// Per-address email cap ("reports to this address in the last 24h").
SubmissionSchema.index({ email: 1, createdAt: -1 });

export type SessionDoc = InferSchemaType<typeof SessionSchema>;
export type SubmissionDoc = InferSchemaType<typeof SubmissionSchema>;

const model = <T>(name: string, schema: Schema): Model<T> =>
  // Untyped call + cast: the generic form sends newer mongoose typings into runaway recursion.
  (mongoose.models[name] ?? mongoose.model(name, schema)) as unknown as Model<T>;

export const AssessmentSession = model<SessionDoc>("AssessmentSession", SessionSchema);
export const Submission = model<SubmissionDoc>("Submission", SubmissionSchema);

export const SESSION_TTL_DAYS = 30;
export const SUBMISSION_TTL_DAYS = 365;
export const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000);
