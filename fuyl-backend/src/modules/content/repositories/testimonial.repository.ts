import { FilterQuery, Types } from 'mongoose';
import { ITestimonial, TestimonialModel } from '../models/testimonial.model';

export class TestimonialRepository {
  async create(data: Partial<ITestimonial>): Promise<ITestimonial> {
    return TestimonialModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<ITestimonial | null> {
    return TestimonialModel.findById(id);
  }

  async update(id: string | Types.ObjectId, patch: Partial<ITestimonial>): Promise<ITestimonial | null> {
    return TestimonialModel.findByIdAndUpdate(id, { $set: patch }, { new: true, runValidators: true });
  }

  async delete(id: string | Types.ObjectId): Promise<void> {
    await TestimonialModel.findByIdAndDelete(id);
  }

  async list(filter: FilterQuery<ITestimonial> = {}) {
    return TestimonialModel.find(filter).sort({ order: 1, createdAt: 1 });
  }

  async paginate(filter: FilterQuery<ITestimonial> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      TestimonialModel.find(filter).sort({ order: 1, createdAt: 1 }).skip(skip).limit(limit),
      TestimonialModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }
}
