import { TemplateRepository } from '../repositories/template.repository';
import { NotificationPreferenceRepository } from '../repositories/preference.repository';
import {
  BadRequestError,
  NotFoundError,
} from '../../../shared/errors';
import { extractVariables } from '../utils/templateEngine';
import { Types } from 'mongoose';

const templateRepo = new TemplateRepository();
const prefRepo = new NotificationPreferenceRepository();

class NotificationAdminService {
  // ─── Templates ───────────────────────────────────────────────
  async listTemplates(filter: Record<string, unknown> = {}) {
    return templateRepo.findAll(filter);
  }

  async getTemplate(id: string) {
    const t = await templateRepo.findById(id);
    if (!t) throw new NotFoundError('Template');
    return t;
  }

  async createTemplate(input: {
    name: string;
    channel: 'email' | 'sms' | 'whatsapp' | 'push';
    subject?: string;
    body: string;
    description?: string;
  }) {
    const variables = extractVariables(input.body + ' ' + (input.subject ?? ''));
    return templateRepo.create({
      ...input,
      name: input.name.toLowerCase().trim(),
      variables,
      isActive: true,
    });
  }

  async updateTemplate(id: string, patch: {
    subject?: string;
    body?: string;
    description?: string;
    isActive?: boolean;
  }) {
    const update: Record<string, unknown> = { ...patch };
    if (patch.body !== undefined || patch.subject !== undefined) {
      const existing = await templateRepo.findById(id);
      if (!existing) throw new NotFoundError('Template');
      const variables = extractVariables((patch.body ?? existing.body) + ' ' + (patch.subject ?? existing.subject ?? ''));
      update.variables = variables;
    }
    const updated = await templateRepo.update(id, update);
    if (!updated) throw new NotFoundError('Template');
    return updated;
  }

  async deactivateTemplate(id: string) {
    await templateRepo.deactivate(id);
  }

  // ─── Preferences ─────────────────────────────────────────────
  async getPreferences(userId: string) {
    return prefRepo.findOrCreate(new Types.ObjectId(userId));
  }

  async updatePreferences(
    userId: string,
    patch: {
      email?: 'enabled' | 'disabled';
      sms?: 'enabled' | 'disabled';
      whatsapp?: 'enabled' | 'disabled';
      push?: 'enabled' | 'disabled';
    }
  ) {
    return prefRepo.update(new Types.ObjectId(userId), patch);
  }

  async setCategoryOverride(
    userId: string,
    category: string,
    preference: 'enabled' | 'disabled'
  ) {
    if (!category) throw new BadRequestError('Category required');
    return prefRepo.setCategoryOverride(new Types.ObjectId(userId), category, preference);
  }

  // ─── Push device tokens ────────────────────────────────────────
  async registerPushToken(userId: string, token: string) {
    if (!token) throw new BadRequestError('Push token required');
    return prefRepo.addPushToken(new Types.ObjectId(userId), token);
  }

  async unregisterPushToken(userId: string, token: string) {
    if (!token) throw new BadRequestError('Push token required');
    await prefRepo.removePushToken(new Types.ObjectId(userId), token);
  }
}

export const notificationAdminService = new NotificationAdminService();
