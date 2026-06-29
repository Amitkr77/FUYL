import { FilterQuery, Types } from 'mongoose';
import { ICategory, CategoryModel } from '../models/category.model';

export class CategoryRepository {
  async create(data: Partial<ICategory>): Promise<ICategory> {
    return CategoryModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<ICategory | null> {
    return CategoryModel.findById(id);
  }

  async findBySlug(slug: string): Promise<ICategory | null> {
    return CategoryModel.findOne({ slug: slug.toLowerCase() });
  }

  async findRoots(): Promise<ICategory[]> {
    return CategoryModel.find({ parentId: { $exists: false }, isActive: true }).sort({ sortOrder: 1, name: 1 });
  }

  async findChildren(parentId: string | Types.ObjectId): Promise<ICategory[]> {
    return CategoryModel.find({ parentId, isActive: true }).sort({ sortOrder: 1, name: 1 });
  }

  async findAll(filter: FilterQuery<ICategory> = {}): Promise<ICategory[]> {
    return CategoryModel.find(filter).sort({ sortOrder: 1, name: 1 });
  }

  async update(id: string | Types.ObjectId, patch: Partial<ICategory>): Promise<ICategory | null> {
    return CategoryModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true });
  }

  async deactivate(id: string | Types.ObjectId): Promise<void> {
    await CategoryModel.findByIdAndUpdate(id, { $set: { isActive: false } });
  }
}
