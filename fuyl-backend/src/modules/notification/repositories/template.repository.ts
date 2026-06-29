import { ITemplate, TemplateModel } from '../models/template.model';

export class TemplateRepository {
  async findByName(name: string): Promise<ITemplate | null> {
    return TemplateModel.findOne({ name: name.toLowerCase().trim(), isActive: true });
  }

  async findById(id: string): Promise<ITemplate | null> {
    return TemplateModel.findById(id);
  }

  async findAll(filter: Record<string, unknown> = {}) {
    return TemplateModel.find(filter).sort({ name: 1 });
  }

  async create(data: Partial<ITemplate>): Promise<ITemplate> {
    return TemplateModel.create({ ...data, name: (data.name ?? '').toLowerCase().trim() });
  }

  async update(id: string, patch: Partial<ITemplate>): Promise<ITemplate | null> {
    return TemplateModel.findByIdAndUpdate(id, { $set: patch, $inc: { version: 1 } }, { new: true });
  }

  async deactivate(id: string): Promise<void> {
    await TemplateModel.findByIdAndUpdate(id, { $set: { isActive: false } });
  }

  async upsertByName(name: string, patch: Partial<ITemplate>): Promise<ITemplate> {
    const existing = await TemplateModel.findOne({ name: name.toLowerCase().trim() });
    if (existing) {
      return (await TemplateModel.findByIdAndUpdate(
        existing._id,
        { $set: patch, $inc: { version: 1 } },
        { new: true }
      )) as ITemplate;
    }
    return TemplateModel.create({ name: name.toLowerCase().trim(), ...patch });
  }
}
