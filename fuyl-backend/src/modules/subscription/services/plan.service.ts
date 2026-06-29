import { PlanRepository } from '../repositories/plan.repository';
import { CreatePlanInput, UpdatePlanInput } from '../interfaces';
import { NotFoundError } from '../../../shared/errors';

const repo = new PlanRepository();

export class PlanService {
  async create(input: CreatePlanInput) {
    return repo.create(input);
  }

  async listActive() {
    return repo.findActive();
  }

  async listAll(page = 1, limit = 20) {
    return repo.findAll({}, { page, limit });
  }

  async get(id: string) {
    const plan = await repo.findById(id);
    if (!plan) throw new NotFoundError('Subscription plan');
    return plan;
  }

  async update(id: string, input: UpdatePlanInput) {
    const updated = await repo.update(id, input);
    if (!updated) throw new NotFoundError('Subscription plan');
    return updated;
  }

  async deactivate(id: string) {
    await repo.delete(id);
  }
}

export const planService = new PlanService();
