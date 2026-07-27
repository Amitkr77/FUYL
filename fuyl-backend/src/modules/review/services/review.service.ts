import { ReviewRepository } from '../repositories/review.repository';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../../../shared/errors';
import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { logger } from '../../../config/logger';
import { Types } from 'mongoose';
import {
  CreateReviewDTO,
  UpdateReviewDTO,
  SellerReplyDTO,
  ModerationDTO,
} from '../validators';
import { IReview } from '../models/review.model';
import { catalogService } from '../../catalog/services/catalog.service';
import { orderService } from '../../order/services/order.service';
import { OrderStatus } from '../../../shared/enums';

const reviewRepo = new ReviewRepository();

// Orders in these states were never actually fulfilled/paid for — they
// shouldn't back a "Verified Purchase" badge.
const UNVERIFIABLE_ORDER_STATUSES: string[] = [
  OrderStatus.PENDING,
  OrderStatus.CANCELLED,
  OrderStatus.RETURNED,
];

class ReviewService {
  async create(userId: string, authorName: string, dto: CreateReviewDTO): Promise<IReview> {
    // Check for duplicate review
    const existing = await reviewRepo.findByUserAndProduct(userId, dto.productId);
    if (existing) throw new ConflictError('You have already reviewed this product');

    const isVerifiedPurchase = dto.orderId
      ? await this.verifyPurchase(userId, dto.orderId, dto.productId)
      : false;

    const review = await reviewRepo.create({
      productId: new Types.ObjectId(dto.productId),
      variantId: dto.variantId ? new Types.ObjectId(dto.variantId) : undefined,
      orderId: dto.orderId ? new Types.ObjectId(dto.orderId) : undefined,
      userId: new Types.ObjectId(userId),
      authorName,
      rating: dto.rating,
      title: dto.title,
      body: dto.body,
      images: dto.images,
      isVerifiedPurchase,
      source: isVerifiedPurchase ? 'verified_purchase' : 'organic',
      status: 'pending',
      helpfulVotes: 0,
      reportedCount: 0,
    });

    eventBus.publish(Events.REVIEW_SUBMITTED, {
      reviewId: review._id.toString(),
      productId: dto.productId,
      userId,
      rating: dto.rating,
    });
    logger.info(`[review] submitted by ${userId} for product ${dto.productId} (${dto.rating}★)`);

    return review;
  }

  // "Verified Purchase" is a trust signal shown to every shopper — it must
  // never rest on a client-supplied flag. Confirms the order belongs to this
  // user, actually contains this product, and was placed (not still pending
  // payment, cancelled, or returned) before honouring an orderId the client sent.
  private async verifyPurchase(userId: string, orderId: string, productId: string): Promise<boolean> {
    try {
      const order = await orderService.getById(orderId);
      if (order.customerId.toString() !== userId) return false;
      if (UNVERIFIABLE_ORDER_STATUSES.includes(order.status)) return false;
      return order.items.some((item) => item.productId.toString() === productId);
    } catch {
      // Bad/unknown orderId — fail closed to "not verified" rather than
      // blocking review submission over a malformed id.
      return false;
    }
  }

  // Recomputes the live, approved-only rating aggregate for a product and
  // persists it onto Product.ratingAverage/ratingCount — the cached fields
  // product listings and the PDP's own header read (distinct from the
  // reviews section, which always queries the live aggregate directly).
  private async syncProductRating(productId: string): Promise<void> {
    const { average, count } = await reviewRepo.aggregateRating(productId);
    await catalogService.updateProductRating(productId, average, count);
  }

  async getById(id: string): Promise<IReview> {
    const r = await reviewRepo.findById(id);
    if (!r) throw new NotFoundError('Review');
    return r;
  }

  async listByProduct(productId: string, page = 1, limit = 20) {
    return reviewRepo.findByProduct(productId, {}, page, limit);
  }

  async listMine(userId: string) {
    return reviewRepo.findByUser(userId);
  }

  async update(id: string, userId: string, dto: UpdateReviewDTO): Promise<IReview> {
    const review = await this.getById(id);
    if (review.userId.toString() !== userId) throw new ForbiddenError('Cannot edit someone else\'s review');
    const wasApproved = review.status === 'approved';
    // Reset to pending after edit
    const updated = await reviewRepo.update(id, { ...dto, status: 'pending' });
    if (!updated) throw new NotFoundError('Review');
    // An edited review drops out of the public/approved set until
    // re-moderated — the product's cached rating needs to reflect that now,
    // not just whenever the next moderation pass happens to run.
    if (wasApproved) await this.syncProductRating(review.productId.toString());
    return updated;
  }

  async delete(id: string, userId: string, role: string): Promise<void> {
    const review = await this.getById(id);
    if (review.userId.toString() !== userId && role !== 'admin' && role !== 'super_admin') {
      throw new ForbiddenError('Not authorized to delete this review');
    }
    await reviewRepo.delete(id);
    if (review.status === 'approved') await this.syncProductRating(review.productId.toString());
  }

  async markHelpful(id: string): Promise<void> {
    await reviewRepo.incrementHelpful(id);
  }

  async report(id: string): Promise<void> {
    await reviewRepo.incrementReports(id);
    const review = await this.getById(id);
    if (review.reportedCount >= 5 && review.status === 'approved') {
      await reviewRepo.update(id, { status: 'flagged' });
      await this.syncProductRating(review.productId.toString());
    }
  }

  async sellerReply(reviewId: string, sellerId: string, dto: SellerReplyDTO): Promise<IReview> {
    const review = await this.getById(reviewId);
    // Verify seller owns the product (skipped — caller can verify if needed)
    const updated = await reviewRepo.setSellerReply(reviewId, {
      body: dto.body,
      repliedBy: sellerId,
    });
    if (!updated) throw new NotFoundError('Review');
    return updated;
  }

  // ─── Admin: Moderation ────────────────────────────────────────
  async listPending(page = 1, limit = 50) {
    return reviewRepo.findPending(page, limit);
  }

  async listFlagged(limit = 100) {
    return reviewRepo.findFlagged(limit);
  }

  async moderate(reviewId: string, adminId: string, dto: ModerationDTO): Promise<IReview> {
    const updated = await reviewRepo.update(reviewId, {
      status: dto.status,
      moderationNote: dto.moderationNote,
      moderatedBy: new Types.ObjectId(adminId),
      moderatedAt: new Date(),
    });
    if (!updated) throw new NotFoundError('Review');
    // Covers every transition (into or out of 'approved') in one place,
    // rather than tracking the previous status — recomputing is cheap and
    // always correct.
    await this.syncProductRating(updated.productId.toString());
    return updated;
  }

  async listAll(filter: Record<string, unknown> = {}, page = 1, limit = 20) {
    return reviewRepo.paginate(filter, page, limit);
  }

  async getRatingSummary(productId: string) {
    return reviewRepo.aggregateRating(productId);
  }
}

export const reviewService = new ReviewService();
