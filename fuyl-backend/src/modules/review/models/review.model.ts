import mongoose, { Schema, Document, Types } from 'mongoose';

export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged';
export type ReviewSource = 'organic' | 'invited' | 'verified_purchase' | 'sample';

export interface IReview extends Document {
  productId: Types.ObjectId;
  variantId?: Types.ObjectId;
  orderId?: Types.ObjectId;             // purchase-verifying
  userId: Types.ObjectId;
  authorName: string;
  authorAvatarUrl?: string;
  rating: number;                       // 1-5
  title?: string;
  body: string;
  images?: string[];
  isVerifiedPurchase: boolean;
  isSubscribedCustomer: boolean;
  source: ReviewSource;
  status: ReviewStatus;
  moderationNote?: string;
  moderatedBy?: Types.ObjectId;
  moderatedAt?: Date;
  // Seller reply
  sellerReply?: {
    body: string;
    repliedAt: Date;
    repliedBy: Types.ObjectId;
  };
  // Helpful votes
  helpfulVotes: number;
  reportedCount: number;
  // Incentive tracking
  incentiveGiven?: string;              // 'wallet_credit' | 'coupon' | 'none'
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<ReviewReviewSchema>(
  {
    productId: { type: Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    variantId: { type: Schema.Types.ObjectId, ref: 'Variant', index: true, sparse: true },
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', index: true, sparse: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorName: { type: String, required: true, trim: true },
    authorAvatarUrl: { type: String },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, maxlength: 200 },
    body: { type: String, required: true, maxlength: 5000 },
    images: [{ type: String }],
    isVerifiedPurchase: { type: Boolean, default: false, index: true },
    isSubscribedCustomer: { type: Boolean, default: false },
    source: { type: String, enum: ['organic', 'invited', 'verified_purchase', 'sample'], default: 'organic' },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'flagged'], default: 'pending', index: true },
    moderationNote: { type: String },
    moderatedBy: { type: Schema.Types.ObjectId, ref: 'User', index: true, sparse: true },
    moderatedAt: { type: Date },
    sellerReply: {
      body: { type: String, maxlength: 1000 },
      repliedAt: { type: Date },
      repliedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    },
    helpfulVotes: { type: Number, default: 0, min: 0 },
    reportedCount: { type: Number, default: 0, min: 0 },
    incentiveGiven: { type: String },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

// One review per user per product/variant
ReviewSchema.index({ productId: 1, userId: 1 }, { unique: true });
ReviewSchema.index({ productId: 1, status: 1, rating: -1 });
ReviewSchema.index({ userId: 1, createdAt: -1 });

export const ReviewModel = mongoose.model<IReview>('Review', ReviewSchema, 'reviews');

// This is a placeholder alias to satisfy TS Schema<...> generic typing above
type ReviewReviewSchema = IReview;
