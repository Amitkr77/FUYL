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
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: "sessions", minimize: false },
);
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

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
    email_status: { type: String, enum: ["pending", "sent", "logged", "failed"], default: "pending" },
    email_error: String,
    ctaClickedAt: Date,
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true, collection: "submissions", minimize: false },
);
SubmissionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SubmissionSchema.index({ createdAt: -1 });

export type SessionDoc = InferSchemaType<typeof SessionSchema>;
export type SubmissionDoc = InferSchemaType<typeof SubmissionSchema>;

const model = <T>(name: string, schema: Schema): Model<T> =>
  (mongoose.models[name] as Model<T>) ?? mongoose.model<T>(name, schema);

export const AssessmentSession = model<SessionDoc>("AssessmentSession", SessionSchema);
export const Submission = model<SubmissionDoc>("Submission", SubmissionSchema);

export const SESSION_TTL_DAYS = 30;
export const SUBMISSION_TTL_DAYS = 365;
export const daysFromNow = (d: number) => new Date(Date.now() + d * 86_400_000);
