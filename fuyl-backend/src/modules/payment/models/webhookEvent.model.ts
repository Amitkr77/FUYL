import mongoose, { Schema, Document } from 'mongoose';

/** Durable idempotency claim for payment gateway webhook deliveries. */
export interface IWebhookEvent extends Document {
  eventKey: string;
  provider: 'cashfree';
  eventType: string;
  status: 'processing' | 'processed';
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WebhookEventSchema = new Schema<IWebhookEvent>(
  {
    eventKey:   { type: String, required: true, unique: true, index: true },
    provider:   { type: String, required: true, enum: ['cashfree'] },
    eventType:  { type: String, required: true },
    status:     { type: String, required: true, enum: ['processing', 'processed'], default: 'processing' },
    processedAt:{ type: Date },
  },
  { timestamps: true }
);

// Retain replay claims for 180 days without growing this operational table forever.
WebhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

export const WebhookEventModel = mongoose.model<IWebhookEvent>(
  'PaymentWebhookEvent',
  WebhookEventSchema,
  'payment_webhook_events'
);
