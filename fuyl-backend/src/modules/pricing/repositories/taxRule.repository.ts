import { Types } from 'mongoose';
import { ITaxRule, TaxRuleModel } from '../models/taxRule.model';

export class TaxRuleRepository {
  async create(data: Partial<ITaxRule>): Promise<ITaxRule> {
    return TaxRuleModel.create(data);
  }

  async findById(id: string): Promise<ITaxRule | null> {
    return TaxRuleModel.findById(id);
  }

  async findByCode(code: string): Promise<ITaxRule | null> {
    return TaxRuleModel.findOne({ code: code.toUpperCase().trim() });
  }

  async findAll(filter: Record<string, unknown> = {}) {
    return TaxRuleModel.find(filter).sort({ code: 1 });
  }

  async findActive(): Promise<ITaxRule[]> {
    const now = new Date();
    return TaxRuleModel.find({
      isActive: true,
      $and: [
        { $or: [{ startsAt: { $exists: false } }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: { $exists: false } }, { endsAt: { $gte: now } }] },
      ],
    });
  }

  async update(id: string, patch: Partial<ITaxRule>, unset: string[] = []): Promise<ITaxRule | null> {
    const update: Record<string, unknown> = { $set: patch };
    if (unset.length) update.$unset = Object.fromEntries(unset.map((field) => [field, 1]));
    return TaxRuleModel.findByIdAndUpdate(id, update, { new: true, runValidators: true });
  }

  async delete(id: string): Promise<void> {
    const rule = await TaxRuleModel.findById(id);
    if (!rule) return;
    await TaxRuleModel.findByIdAndDelete(id);
  }
}
