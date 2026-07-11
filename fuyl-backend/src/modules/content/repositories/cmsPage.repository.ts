import { FilterQuery, Types } from 'mongoose';
import { ICMSPage, CMSPageModel } from '../models/cmsPage.model';

export class CMSPageRepository {
  async create(data: Partial<ICMSPage>): Promise<ICMSPage> {
    return CMSPageModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<ICMSPage | null> {
    return CMSPageModel.findById(id);
  }

  async findBySlug(slug: string): Promise<ICMSPage | null> {
    return CMSPageModel.findOne({ slug: slug.toLowerCase() });
  }

  async slugExists(slug: string): Promise<boolean> {
    return (await CMSPageModel.exists({ slug })) !== null;
  }

  async update(id: string | Types.ObjectId, patch: Partial<ICMSPage>): Promise<ICMSPage | null> {
    return CMSPageModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true });
  }

  async delete(id: string | Types.ObjectId): Promise<void> {
    await CMSPageModel.findByIdAndDelete(id);
  }

  async paginate(filter: FilterQuery<ICMSPage> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      CMSPageModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      CMSPageModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }
}
