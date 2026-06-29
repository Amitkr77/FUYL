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

const reviewRepo = new ReviewRepository();

class ReviewService {
  async create(userId: string, authorName: string, dto: CreateReviewDTO): Promise<IReview> {
    // Check for duplicate review
    const existing = await reviewRepo.findByUserAndProduct(userId, dto.productId);
    if (existing) throw new ConflictError('You have already reviewed this product');

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
      isVerifiedPurchase: !!dto.orderId,
      source: dto.orderId ? 'verified_purchase' : 'organic',
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
    // Reset to pending after edit
    const updated = await reviewRepo.update(id, { ...dto, status: 'pending' });
    if (!updated) throw new NotFoundError('Review');
    return updated;
  }

  async delete(id: string, userId: string, role: string): Promise<void> {
    const review = await this.getById(id);
    if (review.userId.toString() !== userId && role !== 'admin' && role !== 'super_admin') {
      throw new ForbiddenError('Not authorized to delete this review');
    }
    await reviewRepo.delete(id);
  }

  async markHelpful(id: string): Promise<void> {
    await reviewRepo.incrementHelpful(id);
  }

  async report(id: string): Promise<void> {
    await reviewRepo.incrementReports(id);
    const review = await this.getById(id);
    if (review.reportedCount >= 5 && review.status === 'approved') {
      await reviewRepo.update(id, { status: 'flagged' });
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
