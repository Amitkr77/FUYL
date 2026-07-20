import mongoose, { Schema, Document } from 'mongoose';

/**
 * Lifecycle states for a newsletter subscriber. We never delete rows on
 * unsubscribe — the status is flipped instead so the full subscription history
 * (and prior consent) is preserved for compliance/audit.
 */
export type NewsletterStatus = 'pending' | 'active' | 'unsubscribed';

export const NEWSLETTER_STATUSES: NewsletterStatus[] = ['pending', 'active', 'unsubscribed'];

/** Append-only audit trail entry. */
export interface INewsletterEvent {
  action:
    | 'subscribed'
    | 'confirmation_sent'
    | 'verified'
    | 'unsubscribed'
    | 'resubscribed';
  at: Date;
  meta?: Record<string, unknown>;
}

export interface INewsletterSubscriber extends Document {
  email: string;
  status: NewsletterStatus;

  // Double opt-in — raw token is emailed, only its SHA-256 hash is stored.
  verificationTokenHash?: string | null;
  verificationExpiresAt?: Date | null;
  lastConfirmationSentAt?: Date | null;

  // Stable opaque token embedded in every email's unsubscribe link. Low
  // sensitivity (worst case: someone unsubscribes an address) so it's stored
  // as-is for direct lookup rather than hashed.
  unsubscribeToken: string;

  source?: string;
  subscribedAt: Date;
  verifiedAt?: Date | null;
  unsubscribedAt?: Date | null;

  history: INewsletterEvent[];

  createdAt: Date;
  updatedAt: Date;
}

const NewsletterEventSchema = new Schema<INewsletterEvent>(
  {
    action: {
      type: String,
      required: true,
      enum: ['subscribed', 'confirmation_sent', 'verified', 'unsubscribed', 'resubscribed'],
    },
    at: { type: Date, required: true, default: () => new Date() },
    meta: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const NewsletterSubscriberSchema = new Schema<INewsletterSubscriber>(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      maxlength: 200,
    },
    status: {
      type: String,
      enum: NEWSLETTER_STATUSES,
      default: 'pending',
      index: true,
    },

    verificationTokenHash: { type: String, default: null },
    verificationExpiresAt: { type: Date, default: null },
    lastConfirmationSentAt: { type: Date, default: null },

    unsubscribeToken: { type: String, required: true, index: true },

    source: { type: String, maxlength: 100, default: 'website' },
    subscribedAt: { type: Date, default: () => new Date() },
    verifiedAt: { type: Date, default: null },
    unsubscribedAt: { type: Date, default: null },

    history: { type: [NewsletterEventSchema], default: [] },
  },
  { timestamps: true }
);

// Fast lookup when a verification link is clicked.
NewsletterSubscriberSchema.index({ verificationTokenHash: 1 });

export const NewsletterSubscriberModel = mongoose.model<INewsletterSubscriber>(
  'NewsletterSubscriber',
  NewsletterSubscriberSchema,
  'newsletter_subscribers'
);
