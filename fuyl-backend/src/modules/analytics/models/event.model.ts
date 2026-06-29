import mongoose, { Schema, Document, Types } from 'mongoose';

export type MetricBucket = 'minute' | 'hour' | 'day' | 'week' | 'month';

export interface IAnalyticsEvent extends Document {
  event: string;                     // e.g. 'order.placed', 'subscription.charged'
  userId?: Types.ObjectId;
  sessionId?: string;
  // Properties (freeform)
  properties: Record<string, unknown>;
  // Context
  ip?: string;
  userAgent?: string;
  page?: string;
  referrer?: string;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  // Monetary value (for revenue events)
  value?: number;
  currency?: string;
  // Timestamp
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AnalyticsEventSchema = new Schema<IAnalyticsEvent>(
  {
    event: { type: String, required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
    sessionId: { type: String, index: true, sparse: true },
    properties: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String },
    userAgent: { type: String },
    page: { type: String },
    referrer: { type: String },
    utm: {
      source: { type: String, index: true, sparse: true },
      medium: { type: String },
      campaign: { type: String, index: true, sparse: true },
      term: { type: String },
      content: { type: String },
    },
    value: { type: Number, min: 0 },
    currency: { type: String, default: 'INR' },
    occurredAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

AnalyticsEventSchema.index({ event: 1, occurredAt: -1 });
AnalyticsEventSchema.index({ userId: 1, event: 1, occurredAt: -1 });

export const AnalyticsEventModel = mongoose.model<IAnalyticsEvent>('AnalyticsEvent', AnalyticsEventSchema, 'analytics_events');


export interface IAnalyticsMetric extends Document {
  metric: string;                    // e.g. 'revenue.daily', 'orders.daily'
  bucket: MetricBucket;
  bucketStart: Date;
  value: number;
  count: number;
  // Optional breakdown
  dimensions?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

const AnalyticsMetricSchema = new Schema<IAnalyticsMetric>(
  {
    metric: { type: String, required: true, index: true },
    bucket: { type: String, enum: ['minute', 'hour', 'day', 'week', 'month'], required: true },
    bucketStart: { type: Date, required: true, index: true },
    value: { type: Number, default: 0 },
    count: { type: Number, default: 0 },
    dimensions: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

AnalyticsMetricSchema.index({ metric: 1, bucket: 1, bucketStart: 1 }, { unique: true });

export const AnalyticsMetricModel = mongoose.model<IAnalyticsMetric>('AnalyticsMetric', AnalyticsMetricSchema, 'analytics_metrics');
