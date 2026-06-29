import { FilterQuery, Types } from 'mongoose';
import { ITag, TagModel } from '../models/tag.model';
import { IAttribute, AttributeModel } from '../models/attribute.model';
import { ICollection, CollectionModel } from '../models/collection.model';

export class TagRepository {
  async create(data: Partial<ITag>): Promise<ITag> {
    return TagModel.create(data);
  }
  async findById(id: string | Types.ObjectId): Promise<ITag | null> {
    return TagModel.findById(id);
  }
  async findBySlug(slug: string): Promise<ITag | null> {
    return TagModel.findOne({ slug: slug.toLowerCase() });
  }
  async findAll(): Promise<ITag[]> {
    return TagModel.find().sort({ name: 1 });
  }
}

export class AttributeRepository {
  async create(data: Partial<IAttribute>): Promise<IAttribute> {
    return AttributeModel.create(data);
  }
  async findById(id: string | Types.ObjectId): Promise<IAttribute | null> {
    return AttributeModel.findById(id);
  }
  async findBySlug(slug: string): Promise<IAttribute | null> {
    return AttributeModel.findOne({ slug: slug.toLowerCase() });
  }
  async findAll(): Promise<IAttribute[]> {
    return AttributeModel.find().sort({ name: 1 });
  }
  async findFilterable(): Promise<IAttribute[]> {
    return AttributeModel.find({ isFilterable: true }).sort({ name: 1 });
  }
}

export class CollectionRepository {
  async create(data: Partial<ICollection>): Promise<ICollection> {
    return CollectionModel.create(data);
  }
  async findById(id: string | Types.ObjectId): Promise<ICollection | null> {
    return CollectionModel.findById(id);
  }
  async findBySlug(slug: string): Promise<ICollection | null> {
    return CollectionModel.findOne({ slug: slug.toLowerCase() });
  }
  async findActive(): Promise<ICollection[]> {
    const now = new Date();
    return CollectionModel.find({
      isActive: true,
      $and: [
        { $or: [{ startsAt: { $exists: false } }, { startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gt: now } }] },
      ],
    }).sort({ createdAt: -1 });
  }
  async findAll(filter: FilterQuery<ICollection> = {}): Promise<ICollection[]> {
    return CollectionModel.find(filter).sort({ createdAt: -1 });
  }
  async update(id: string | Types.ObjectId, patch: Partial<ICollection>): Promise<ICollection | null> {
    return CollectionModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true });
  }
  async deactivate(id: string | Types.ObjectId): Promise<void> {
    await CollectionModel.findByIdAndUpdate(id, { $set: { isActive: false } });
  }
}
