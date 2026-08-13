import { FilterQuery } from 'mongoose';
import { IReferralProgram, ReferralProgramModel } from '../models/program.model';
import { CreateProgramInput, UpdateProgramInput } from '../interfaces';

export class ProgramRepository {
  async create(data: CreateProgramInput): Promise<IReferralProgram> {
    return ReferralProgramModel.create(data);
  }

  async findById(id: string): Promise<IReferralProgram | null> {
    return ReferralProgramModel.findById(id);
  }

  async findActive(now: Date = new Date()): Promise<IReferralProgram | null> {
    return ReferralProgramModel.findOne({
      isActive: true,
      startsAt: { $lte: now },
      $or: [{ endsAt: { $exists: false } }, { endsAt: null }, { endsAt: { $gt: now } }],
    }).sort({ createdAt: -1 });
  }

  async findAll(filter: FilterQuery<IReferralProgram> = {}, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      ReferralProgramModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      ReferralProgramModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async update(id: string, data: UpdateProgramInput): Promise<IReferralProgram | null> {
    return ReferralProgramModel.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
  }

  async deactivate(id: string): Promise<void> {
    await ReferralProgramModel.findByIdAndUpdate(id, { isActive: false });
  }
}
