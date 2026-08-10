import crypto from 'crypto';
import { LinkRepository } from '../repositories/link.repository';
import { ClickRepository } from '../repositories/click.repository';
import { AttributionRepository } from '../repositories/attribution.repository';
import { ProgramRepository } from '../repositories/program.repository';
import { AffiliateRepository } from '../repositories/affiliate.repository';
import { AttributionMethod, AffiliateStatus } from '../../../shared/enums';
import { NotFoundError, BadRequestError } from '../../../shared/errors';
import { logger } from '../../../config/logger';

const linkRepo        = new LinkRepository();
const clickRepo       = new ClickRepository();
const attributionRepo = new AttributionRepository();
const programRepo     = new ProgramRepository();
const affiliateRepo   = new AffiliateRepository();

export class TrackingService {
  /**
   * Called when a visitor hits /api/v1/affiliate/r/:code.
   * Records click + creates an attribution record; returns the destination URL.
   */
  async recordClick(input: {
    code: string;
    ip: string;
    userAgent?: string;
    landingPage: string;
    customerId?: string;
  }): Promise<{ destination: string; token: string }> {
    const link = await linkRepo.findByCode(input.code);
    if (!link) throw new NotFoundError('Affiliate link');

    const affiliate = await affiliateRepo.findById(link.affiliateId);
    if (!affiliate || affiliate.status !== AffiliateStatus.APPROVED) {
      throw new BadRequestError('Affiliate not active');
    }

    const program = await programRepo.findById(affiliate.programId);
    const windowDays = program?.attributionWindowDays ?? 30;

    const ipHash = crypto.createHash('sha256').update(input.ip).digest('hex');

    // Record click
    const click = await clickRepo.create({
      affiliateId: link.affiliateId,
      linkId:      link._id,
      ipHash,
      userAgent:   input.userAgent,
      landingPage: input.landingPage,
    });

    // Create a server-side attribution record
    const token = crypto.randomUUID();
    await attributionRepo.create({
      affiliateId: link.affiliateId,
      linkId:      link._id,
      method:      AttributionMethod.LINK,
      token,
      customerId:  input.customerId ? (input.customerId as any) : undefined,
      expiresAt:   new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000),
    });

    // Increment affiliate click counter (best-effort)
    affiliateRepo.incrementStats(affiliate._id, { totalClicks: 1 }).catch((err) =>
      logger.warn('[affiliate] failed to inc click stat', err)
    );

    logger.info(`[affiliate] click recorded: affiliate=${affiliate._id} link=${link._id} click=${click._id}`);
    return { destination: link.destination, token };
  }

  /**
   * Resolve the attribution for an order at checkout.
   * Checks the attribution token (from cookie) first, then the coupon code.
   * Returns { affiliateId, attributionId, method } or null if no attribution.
   */
  async resolveForCheckout(input: {
    attributionToken?: string;
    couponCode?: string;
    userId: string;
  }): Promise<{
    affiliateId:      string;
    attributionId:    string;
    method:           'link' | 'coupon';
  } | null> {
    // 1. Token-based (link click)
    if (input.attributionToken) {
      const attr = await attributionRepo.findByToken(input.attributionToken);
      if (attr) {
        const affiliate = await affiliateRepo.findById(attr.affiliateId);
        if (affiliate?.status === AffiliateStatus.APPROVED) {
          // Block self-referral: reject attribution when the buyer IS the affiliate
          if (affiliate.userId && affiliate.userId.toString() === input.userId) {
            logger.warn(`[affiliate] self-referral blocked: affiliate=${affiliate._id} userId=${input.userId}`);
            return null;
          }
          return {
            affiliateId:   attr.affiliateId.toString(),
            attributionId: attr._id.toString(),
            method:        'link',
          };
        }
      }
    }

    // 2. Coupon-based — look up AffiliateCoupon by coupon code
    // (Implemented when coupon-affiliate mapping is wired; skipped for MVP link-only flow)
    // TODO Phase 2: resolve coupon → affiliate via AffiliateCoupon model

    return null;
  }

  /** Mark an attribution as converted after order is created. */
  async markConverted(attributionId: string, orderId: string): Promise<void> {
    await attributionRepo.markConverted(attributionId, orderId);
  }
}

export const trackingService = new TrackingService();
