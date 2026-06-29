import { CampaignRepository } from '../repositories/campaign.repository';
import { CreateCampaignInput, UpdateCampaignInput } from '../interfaces';
import { NotFoundError } from '../../../shared/errors';

const repo = new CampaignRepository();

export class CampaignService {
  async create(input: CreateCampaignInput) {
    return repo.create(input);
  }

  async list(page = 1, limit = 20) {
    return repo.findAll({}, page, limit);
  }

  async get(id: string) {
    const c = await repo.findById(id);
    if (!c) throw new NotFoundError('Referral campaign');
    return c;
  }

  async getActive() {
    return repo.findActive();
  }

  async update(id: string, input: UpdateCampaignInput) {
    const updated = await repo.update(id, input);
    if (!updated) throw new NotFoundError('Referral campaign');
    return updated;
  }

  async deactivate(id: string) {
    await repo.deactivate(id);
  }
}

export const campaignService = new CampaignService();
