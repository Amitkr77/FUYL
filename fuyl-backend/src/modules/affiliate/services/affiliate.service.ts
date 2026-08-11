import crypto from 'crypto';
import { AffiliateRepository } from '../repositories/affiliate.repository';
import { IAffiliate } from '../models/affiliate.model';
import { ProgramRepository } from '../repositories/program.repository';
import { LinkRepository } from '../repositories/link.repository';
import { CommissionRepository } from '../repositories/commission.repository';
import { PayoutRepository } from '../repositories/payout.repository';
import { AffiliateStatus } from '../../../shared/enums';
import { NotFoundError, ConflictError, BadRequestError } from '../../../shared/errors';
import { logger } from '../../../config/logger';
import mongoose from 'mongoose';

const affiliateRepo  = new AffiliateRepository();
const programRepo    = new ProgramRepository();
const linkRepo       = new LinkRepository();
const commissionRepo = new CommissionRepository();
const payoutRepo     = new PayoutRepository();

export class AffiliateService {
  /** Public: submit an affiliate application. */
  async apply(input: {
    name:     string;
    email:    string;
    phone?:   string;
    channels: string[];
    userId?:  string;
    message?: string;
  }) {
    const existing = await affiliateRepo.findByEmail(input.email);
    if (existing) throw new ConflictError('An application with this email already exists');

    const program = await programRepo.findActive();
    if (!program) throw new BadRequestError('No active affiliate program at this time');

    const affiliate = await affiliateRepo.create({
      name:      input.name,
      email:     input.email,
      phone:     input.phone,
      channels:  input.channels,
      userId:    input.userId ? new mongoose.Types.ObjectId(input.userId) : undefined,
      programId: program._id,
      status:    AffiliateStatus.PENDING,
    });

    logger.info(`[affiliate] new application: ${affiliate.email} (${affiliate._id})`);
    return affiliate;
  }

  /** Admin: approve an application — creates the default tracking link. */
  async approve(affiliateId: string, actorId: string) {
    const affiliate = await affiliateRepo.findById(affiliateId);
    if (!affiliate) throw new NotFoundError('Affiliate');
    if (affiliate.status !== AffiliateStatus.PENDING) {
      throw new ConflictError(`Affiliate is already ${affiliate.status}`);
    }

    await affiliateRepo.update(affiliateId, {
      status:     AffiliateStatus.APPROVED,
      approvedAt: new Date(),
    });

    // Auto-create default tracking link
    const code = await this.generateUniqueCode(affiliate.name);
    await linkRepo.create({
      affiliateId: affiliate._id,
      code,
      destination: '/',
      label:       'Default',
    });

    logger.info(`[affiliate] approved: ${affiliateId} by ${actorId}, code=${code}`);
    return { affiliate, code };
  }

  /** Admin: reject an application. */
  async reject(affiliateId: string, reason: string, actorId: string) {
    const affiliate = await affiliateRepo.findById(affiliateId);
    if (!affiliate) throw new NotFoundError('Affiliate');

    await affiliateRepo.update(affiliateId, {
      status:         AffiliateStatus.REJECTED,
      rejectedAt:     new Date(),
      rejectedReason: reason,
    });

    logger.info(`[affiliate] rejected: ${affiliateId} by ${actorId}: ${reason}`);
  }

  /** Admin: suspend an active affiliate. */
  async suspend(affiliateId: string, reason: string, actorId: string) {
    const affiliate = await affiliateRepo.findById(affiliateId);
    if (!affiliate) throw new NotFoundError('Affiliate');

    await affiliateRepo.update(affiliateId, {
      status:          AffiliateStatus.SUSPENDED,
      suspendedAt:     new Date(),
      suspendedReason: reason,
    });

    logger.info(`[affiliate] suspended: ${affiliateId} by ${actorId}: ${reason}`);
  }

  /** Affiliate: update their own payment info. */
  async updatePaymentInfo(
    affiliateId: string,
    info: { upi?: string; bankAccount?: string; ifsc?: string; accountName?: string }
  ) {
    return affiliateRepo.update(affiliateId, { paymentInfo: info });
  }

  /** Affiliate: create a new tracking link. */
  async createLink(affiliateId: string, input: { destination: string; label?: string }) {
    const affiliate = await affiliateRepo.findById(affiliateId);
    if (!affiliate) throw new NotFoundError('Affiliate');
    if (affiliate.status !== AffiliateStatus.APPROVED) {
      throw new BadRequestError('Only approved affiliates can create links');
    }

    // Destination must be a relative path (no external redirects).
    // This prevents open-redirect attacks where an affiliate could set
    // destination to an arbitrary URL like "https://phishing.example.com".
    const dest = input.destination.trim();
    if (!dest.startsWith('/') || dest.includes('://') || dest.length > 500) {
      throw new BadRequestError('destination must be a relative path starting with /');
    }

    const code = await this.generateUniqueCode(affiliate.name);
    return linkRepo.create({
      affiliateId: affiliate._id,
      code,
      destination: dest,
      label:       input.label,
    });
  }

  /** Affiliate: fetch my dashboard data. */
  async myDashboard(affiliateId: string) {
    const [affiliate, links, commissions, payouts] = await Promise.all([
      affiliateRepo.findById(affiliateId),
      linkRepo.findByAffiliate(affiliateId),
      commissionRepo.findByAffiliate(affiliateId),
      payoutRepo.findByAffiliate(affiliateId),
    ]);
    if (!affiliate) throw new NotFoundError('Affiliate');

    const siteUrl = process.env.CLIENT_URL ?? 'http://localhost:3000';
    const linksWithUrl = links.map((l) => ({
      ...l.toObject(),
      trackingUrl: `${siteUrl}/r/${l.code}`,
    }));

    return {
      affiliate,
      links: linksWithUrl,
      commissions,
      payouts,
      stats: affiliate.stats,
    };
  }

  /** Affiliate: get my payouts. */
  async myPayouts(affiliateId: string) {
    return payoutRepo.findByAffiliate(affiliateId);
  }

  /** Affiliate: get the active program's public details. */
  async getProgram(affiliateId: string) {
    const affiliate = await affiliateRepo.findById(affiliateId);
    if (!affiliate) throw new NotFoundError('Affiliate');
    const program = await programRepo.findById(affiliate.programId);
    if (!program) throw new NotFoundError('Affiliate program');
    return {
      name:                  program.name,
      description:           program.description,
      defaultRate:           program.defaultRate,
      commissionBase:        program.commissionBase,
      attributionWindowDays: program.attributionWindowDays,
      minPayoutAmount:       program.minPayoutAmount,
    };
  }

  /** Affiliate: update their own editable profile fields. */
  async updateProfile(
    affiliateId: string,
    patch: {
      name?:          string;
      phone?:         string;
      channels?:      string[];
      website?:       string;
      socialHandles?: Record<string, string>;
    }
  ) {
    const { website, socialHandles, ...directFields } = patch;
    const update: Partial<IAffiliate> = { ...directFields };

    // website and socialHandles live in the metadata bag so the model
    // schema does not need a migration for every new social platform.
    if (website !== undefined || socialHandles !== undefined) {
      const affiliate = await affiliateRepo.findById(affiliateId);
      if (!affiliate) throw new NotFoundError('Affiliate');
      update.metadata = {
        ...(affiliate.metadata ?? {}),
        ...(website !== undefined ? { website } : {}),
        ...(socialHandles !== undefined ? { socialHandles } : {}),
      };
    }

    return affiliateRepo.update(affiliateId, update);
  }

  /** Affiliate: get my links. */
  async myLinks(affiliateId: string) {
    const links = await linkRepo.findByAffiliate(affiliateId);
    const siteUrl = process.env.CLIENT_URL ?? 'http://localhost:3000';
    return links.map((l) => ({
      ...l.toObject(),
      trackingUrl: `${siteUrl}/r/${l.code}`,
    }));
  }

  /** Find an approved affiliate by their userId (for auth'd requests). */
  async findByUserId(userId: string) {
    const affiliate = await affiliateRepo.findByUserId(userId);
    if (!affiliate) throw new NotFoundError('Affiliate profile');
    return affiliate;
  }

  // ─── Admin helpers ────────────────────────────────────────────────────────

  async adminList(page: number, limit: number, status?: string) {
    const filter = status ? { status } : {};
    return affiliateRepo.paginate(filter, page, limit);
  }

  async adminStats() {
    return affiliateRepo.adminStats();
  }

  // ─── Internals ────────────────────────────────────────────────────────────

  private async generateUniqueCode(name: string): Promise<string> {
    const base = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5);
    for (let attempt = 0; attempt < 10; attempt++) {
      const suffix = crypto.randomBytes(2).toString('hex').toUpperCase();
      const code   = `${base}${suffix}`;
      const exists = await linkRepo.findByCode(code);
      if (!exists) return code;
    }
    return `AFF${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }
}

export const affiliateService = new AffiliateService();
