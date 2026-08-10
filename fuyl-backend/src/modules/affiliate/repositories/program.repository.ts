import { Types } from 'mongoose';
import { AffiliateProgramModel, IAffiliateProgram } from '../models/program.model';

export class ProgramRepository {
  async create(data: Partial<IAffiliateProgram>): Promise<IAffiliateProgram> {
    return AffiliateProgramModel.create(data);
  }

  async findById(id: string | Types.ObjectId): Promise<IAffiliateProgram | null> {
    return AffiliateProgramModel.findById(id);
  }

  async findActive(): Promise<IAffiliateProgram | null> {
    return AffiliateProgramModel.findOne({ isActive: true }).sort({ createdAt: 1 });
  }

  async listAll(): Promise<IAffiliateProgram[]> {
    return AffiliateProgramModel.find().sort({ createdAt: -1 });
  }

  async update(id: string | Types.ObjectId, patch: Partial<IAffiliateProgram>): Promise<IAffiliateProgram | null> {
    return AffiliateProgramModel.findByIdAndUpdate(id, { $set: patch }, { new: true });
  }
}
