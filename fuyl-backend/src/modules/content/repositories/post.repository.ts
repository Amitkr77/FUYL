import { FilterQuery, Types } from 'mongoose';
import { IPost, PostModel } from '../models/post.model';

export class PostRepository {
  async create(data: Partial<IPost>): Promise<IPost> {
    return PostModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<IPost | null> {
    return PostModel.findById(id);
  }

  async findBySlug(slug: string): Promise<IPost | null> {
    return PostModel.findOne({ slug: slug.toLowerCase() });
  }

  async slugExists(slug: string): Promise<boolean> {
    return (await PostModel.exists({ slug })) !== null;
  }

  async update(id: string | Types.ObjectId, patch: Partial<IPost>): Promise<IPost | null> {
    return PostModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true });
  }

  async delete(id: string | Types.ObjectId): Promise<void> {
    await PostModel.findByIdAndDelete(id);
  }

  async incrementViews(id: string | Types.ObjectId): Promise<void> {
    await PostModel.findByIdAndUpdate(id, { $inc: { views: 1 } });
  }

  async paginate(filter: FilterQuery<IPost> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      PostModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      PostModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }
}
