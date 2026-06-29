import { CodeRepository } from '../repositories/code.repository';
import { CampaignRepository } from '../repositories/campaign.repository';
import { generateReferralCode } from '../utils/codeGenerator';
import { ConflictError, NotFoundError } from '../../../shared/errors';
import { env } from '../../../config/env';
import { addDays } from '../../../shared/utils';
import mongoose from 'mongoose';

const codeRepo = new CodeRepository();
const campaignRepo = new CampaignRepository();

export class CodeService {
  /**
   * Generate (or return existing) active code for a user.
   */
  async getOrCreateForUser(userId: string, handle: string) {
    const existing = await codeRepo.findActiveByReferrer(userId);
    if (existing) return existing;

    const campaign = await campaignRepo.findActive();
    const code = generateReferralCode(handle || 'user');

    // Ensure uniqueness — retry up to 3 times
    let attempts = 0;
    while (attempts < 3) {
      const conflict = await codeRepo.findByCode(code);
      if (!conflict) break;
      attempts++;
    }

    return codeRepo.create({
      code,
      referrerId: new mongoose.Types.ObjectId(userId),
      campaignId: campaign?._id,
      expiresAt: addDays(new Date(), env.referral.codeExpiryDays),
      maxUses: 0,
      usesCount: 0,
      isActive: true,
    });
  }

  async validate(code: string) {
    const c = await codeRepo.findByCode(code);
    if (!c) throw new NotFoundError('Referral code');
    if (!c.isActive) throw new ConflictError('Referral code is no longer active');
    if (c.expiresAt && c.expiresAt < new Date()) throw new ConflictError('Referral code has expired');
    if (c.maxUses > 0 && c.usesCount >= c.maxUses) throw new ConflictError('Referral code has reached max uses');
    return c;
  }

  async listMine(userId: string) {
    return codeRepo.findByReferrer(userId);
  }

  async incrementUses(code: string) {
    return codeRepo.incrementUses(code);
  }
}

export const codeService = new CodeService();
