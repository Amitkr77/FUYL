import { Types, FilterQuery } from 'mongoose';
import { IReview, ReviewModel } from '../models/review.model';

export class ReviewRepository {
  async create(data: Partial<IReview>): Promise<IReview> {
    return ReviewModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<IReview | null> {
    return ReviewModel.findById(id);
  }

  async findByProduct(
    productId: string | Types.ObjectId,
    filter: FilterQuery<IReview> = {},
    page = 1,
    limit = 20
  ) {
    const skip = (page - 1) * limit;
    const query = { productId: new Types.ObjectId(productId.toString()), status: 'approved', ...filter };
    const [items, total] = await Promise.all([
      ReviewModel.find(query).sort({ helpfulVotes: -1, createdAt: -1 }).skip(skip).limit(limit),
      ReviewModel.countDocuments(query),
    ]);
    return { items, total, page, limit };
  }

  async findByUser(userId: string | Types.ObjectId, limit = 50) {
    return ReviewModel
      .find({ userId: new Types.ObjectId(userId.toString()) })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async findByUserAndProduct(userId: string | Types.ObjectId, productId: string | Types.ObjectId) {
    return ReviewModel.findOne({
      userId: new Types.ObjectId(userId.toString()),
      productId: new Types.ObjectId(productId.toString()),
    });
  }

  async findPending(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      ReviewModel.find({ status: 'pending' }).sort({ createdAt: 1 }).skip(skip).limit(limit),
      ReviewModel.countDocuments({ status: 'pending' }),
    ]);
    return { items, total, page, limit };
  }

  async findFlagged(limit = 100) {
    return ReviewModel.find({ reportedCount: { $gte: 3 } }).sort({ reportedCount: -1 }).limit(limit);
  }

  async update(id: string | Types.ObjectId, patch: Partial<IReview>): Promise<IReview | null> {
    return ReviewModel.findByIdAndUpdate(id, { $set: patch }, { new: true });
  }

  async delete(id: string | Types.ObjectId): Promise<void> {
    await ReviewModel.findByIdAndDelete(id);
  }

  async incrementHelpful(id: string | Types.ObjectId): Promise<void> {
    await ReviewModel.findByIdAndUpdate(id, { $inc: { helpfulVotes: 1 } });
  }

  async incrementReports(id: string | Types.ObjectId): Promise<void> {
    await ReviewModel.findByIdAndUpdate(id, { $inc: { reportedCount: 1 } });
  }

  async setSellerReply(
    id: string | Types.ObjectId,
    reply: { body: string; repliedBy: string }
  ): Promise<IReview | null> {
    return ReviewModel.findByIdAndUpdate(
      id,
      {
        $set: {
          'sellerReply.body': reply.body,
          'sellerReply.repliedAt': new Date(),
          'sellerReply.repliedBy': new Types.ObjectId(reply.repliedBy),
        },
      },
      { new: true }
    );
  }

  /**
   * Compute aggregated rating for a product.
   */
  async aggregateRating(productId: string | Types.ObjectId) {
    const result = await ReviewModel.aggregate([
      { $match: { productId: new Types.ObjectId(productId.toString()), status: 'approved' } },
      {
        $group: {
          _id: null,
          average: { $avg: '$rating' },
          count: { $sum: 1 },
          distribution: {
            $push: '$rating',
          },
        },
      },
    ]);
    if (!result[0]) return { average: 0, count: 0, distribution: {} as Record<number, number> };
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const r of result[0].distribution) {
      dist[r] = (dist[r] ?? 0) + 1;
    }
    return {
      average: Math.round(result[0].average * 100) / 100,
      count: result[0].count,
      distribution: dist,
    };
  }

  async paginate(filter: FilterQuery<IReview> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      ReviewModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ReviewModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }
}
