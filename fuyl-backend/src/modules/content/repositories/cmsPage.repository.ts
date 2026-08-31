import { FilterQuery, Types } from 'mongoose';
import { ICMSPage, CMSPageModel } from '../models/cmsPage.model';

export class CMSPageRepository {
  async create(data: Partial<ICMSPage>): Promise<ICMSPage> {
    return CMSPageModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<ICMSPage | null> {
    return CMSPageModel.findById(id);
  }

  async findByIdWithRevisions(id: string | Types.ObjectId): Promise<ICMSPage | null> {
    return CMSPageModel.findById(id).select('+revisions');
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

  async updateWithRevision(id: string | Types.ObjectId, patch: Partial<ICMSPage>, revision: NonNullable<ICMSPage['revisions']>[number]): Promise<ICMSPage | null> {
    return CMSPageModel.findByIdAndUpdate(id, {
      $set: patch,
      $push: { revisions: { $each: [revision], $slice: -20 } },
    }, { new: true, runValidators: true });
  }

  async delete(id: string | Types.ObjectId): Promise<void> {
    await CMSPageModel.findByIdAndDelete(id);
  }

  async paginate(filter: FilterQuery<ICMSPage> = {}, page = 1, limit = 20, sort: Record<string, 1 | -1> = { updatedAt: -1 }) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      CMSPageModel.find(filter).sort(sort).skip(skip).limit(limit),
      CMSPageModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async listNavigation() {
    return CMSPageModel.find({
      status: 'published',
      navigationPlacement: { $in: ['header', 'footer', 'both'] },
    }).select('title slug navigationPlacement navigationLabel navigationOrder').sort({ navigationOrder: 1, title: 1 }).lean();
  }

  async listForQualityAudit() {
    return CMSPageModel.find({}).select('title slug body seoTitle seoDescription status navigationPlacement updatedAt').sort({ updatedAt: -1 }).lean();
  }

  async updateNavigation(items: Array<{ id: string; navigationPlacement: ICMSPage['navigationPlacement']; navigationLabel: string; navigationOrder: number }>) {
    if (!items.length) return;
    await CMSPageModel.bulkWrite(items.map((item) => ({
      updateOne: {
        filter: { _id: item.id, status: 'published' },
        update: { $set: {
          navigationPlacement: item.navigationPlacement,
          navigationLabel: item.navigationLabel,
          navigationOrder: item.navigationOrder,
        } },
      },
    })));
  }
}
