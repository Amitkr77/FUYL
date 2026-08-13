import { ProgramRepository } from '../repositories/program.repository';
import { CreateProgramInput, UpdateProgramInput } from '../interfaces';
import { NotFoundError } from '../../../shared/errors';

const repo = new ProgramRepository();

export class ProgramService {
  async create(input: CreateProgramInput) {
    return repo.create(input);
  }

  async list(page = 1, limit = 20) {
    return repo.findAll({}, page, limit);
  }

  async get(id: string) {
    const c = await repo.findById(id);
    if (!c) throw new NotFoundError('Referral program');
    return c;
  }

  async getActive() {
    return repo.findActive();
  }

  async update(id: string, input: UpdateProgramInput) {
    const updated = await repo.update(id, input);
    if (!updated) throw new NotFoundError('Referral program');
    return updated;
  }

  async deactivate(id: string) {
    await repo.deactivate(id);
  }
}

export const programService = new ProgramService();
