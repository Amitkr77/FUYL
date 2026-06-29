import { CampaignRepository } from '../repositories/campaign.repository';
import { RedemptionRepository } from '../repositories/redemption.repository';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../../../shared/errors';
import { logger } from '../../../config/logger';
import { Types } from 'mongoose';
import { CreateCampaignDTO, UpdateCampaignDTO, ValidateCouponDTO } from '../validators';
import { ICoupon } from '../models/campaign.model';

const campaignRepo = new CampaignRepository();
const redemptionRepo = new RedemptionRepository();

export interface CouponValidationResult {
  valid: boolean;
  reason?: string;
  discountAmount?: number;
  discountType?: string;
  couponCode: string;
  campaignId?: string;
}

class PromotionService {
  // ─── Admin: Campaigns ─────────────────────────────────────────
  async createCampaign(dto: CreateCampaignDTO) {
    // Normalize coupon codes to uppercase
    const coupons = (dto.coupons ?? []).map((c) => ({
      ...c,
      code: c.code.toUpperCase(),
      startsAt: c.startsAt ? new Date(c.startsAt) : new Date(dto.startsAt),
      endsAt: c.endsAt ? new Date(c.endsAt) : (dto.endsAt ? new Date(dto.endsAt) : undefined),
      redemptionsCount: 0,
    }));

    // Verify uniqueness of coupon codes within this campaign
    const codes = new Set(coupons.map((c) => c.code));
    if (codes.size !== coupons.length) {
      throw new BadRequestError('Duplicate coupon codes in payload');
    }

    // Verify codes don't exist in another campaign
    for (const c of coupons) {
      const existing = await campaignRepo.findByCouponCode(c.code);
      if (existing) throw new ConflictError(`Coupon code "${c.code}" already exists`);
    }

    return campaignRepo.create({
      ...dto,
      startsAt: new Date(dto.startsAt),
      endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      coupons: coupons as any,
      customerIds: (dto.customerIds ?? []).map((id) => new Types.ObjectId(id)),
      autoRule: dto.autoRule ? {
        ...dto.autoRule,
        targetIds: (dto.autoRule.targetIds ?? []).map((id) => new Types.ObjectId(id)),
      } : undefined,
    });
  }

  async getCampaign(id: string) {
    const c = await campaignRepo.findById(id);
    if (!c) throw new NotFoundError('Campaign');
    return c;
  }

  async listCampaigns(page = 1, limit = 20, filter: Record<string, unknown> = {}) {
    return campaignRepo.findAll(filter, page, limit);
  }

  async listActive() {
    return campaignRepo.findActive();
  }

  async listFeatured() {
    return campaignRepo.findFeatured();
  }

  async updateCampaign(id: string, dto: UpdateCampaignDTO) {
    const patch: Record<string, unknown> = { ...dto };
    if (dto.endsAt !== undefined) patch.endsAt = dto.endsAt ? new Date(dto.endsAt) : undefined;
    if (dto.customerIds !== undefined) patch.customerIds = dto.customerIds.map((id) => new Types.ObjectId(id));
    if (dto.coupons !== undefined) {
      // Re-validate codes
      for (const c of dto.coupons) {
        const upper = c.code.toUpperCase();
        const other = await campaignRepo.findByCouponCode(upper);
        if (other && other._id.toString() !== id) {
          throw new ConflictError(`Coupon code "${upper}" already exists in another campaign`);
        }
      }
      patch.coupons = dto.coupons.map((c: any) => ({
        ...c,
        code: c.code.toUpperCase(),
        startsAt: c.startsAt ? new Date(c.startsAt) : new Date(),
        endsAt: c.endsAt ? new Date(c.endsAt) : undefined,
      }));
    }
    const updated = await campaignRepo.update(id, patch);
    if (!updated) throw new NotFoundError('Campaign');
    return updated;
  }

  async deleteCampaign(id: string) {
    await campaignRepo.delete(id);
  }

  // ─── Customer-facing: Validate + Redeem ──────────────────────
  async validateCoupon(userId: string, dto: ValidateCouponDTO): Promise<CouponValidationResult> {
    const code = dto.code.toUpperCase().trim();
    const campaign = await campaignRepo.findByCouponCode(code);
    if (!campaign) {
      return { valid: false, reason: 'Coupon code not found', couponCode: code };
    }

    const coupon = campaign.coupons.find((c) => c.code === code);
    if (!coupon || !coupon.isActive) {
      return { valid: false, reason: 'Coupon is inactive', couponCode: code };
    }

    // Time window
    const now = new Date();
    if (coupon.startsAt > now) {
      return { valid: false, reason: 'Coupon not yet active', couponCode: code };
    }
    if (coupon.endsAt && coupon.endsAt < now) {
      return { valid: false, reason: 'Coupon expired', couponCode: code };
    }

    // Global redemption limit
    if (coupon.maxRedemptionsGlobal !== undefined && coupon.redemptionsCount >= coupon.maxRedemptionsGlobal) {
      return { valid: false, reason: 'Coupon fully redeemed', couponCode: code };
    }

    // Per-user limit
    if (coupon.maxRedemptionsPerUser !== undefined) {
      const userCount = await redemptionRepo.countByUserAndCode(userId, code);
      if (userCount >= coupon.maxRedemptionsPerUser) {
        return { valid: false, reason: 'You have already used this coupon', couponCode: code };
      }
    }

    // First-order only
    if (coupon.isFirstOrderOnly && !dto.isFirstOrder) {
      return { valid: false, reason: 'Coupon valid only on first order', couponCode: code };
    }

    // Minimum subtotal
    if (coupon.minOrderSubtotal !== undefined && dto.cartSubtotal < coupon.minOrderSubtotal) {
      return {
        valid: false,
        reason: `Minimum order subtotal ₹${coupon.minOrderSubtotal} required`,
        couponCode: code,
      };
    }

    // Scope check
    const discountAmount = this.computeDiscountAmount(coupon, dto);
    if (discountAmount <= 0 && coupon.discountType !== 'free_shipping') {
      return { valid: false, reason: 'Coupon does not apply to your cart', couponCode: code };
    }

    return {
      valid: true,
      discountAmount: Math.round(discountAmount * 100) / 100,
      discountType: coupon.discountType,
      couponCode: code,
      campaignId: campaign._id.toString(),
    };
  }

  /**
   * Finalize a coupon redemption at checkout time. Records the redemption and
   * increments the campaign counter. Called by the checkout module after order placement.
   */
  async redeem(userId: string, code: string, orderId: string, discountAmount: number, cartId?: string): Promise<void> {
    const upperCode = code.toUpperCase().trim();
    const campaign = await campaignRepo.findByCouponCode(upperCode);
    if (!campaign) throw new NotFoundError('Coupon');

    const coupon = campaign.coupons.find((c) => c.code === upperCode);
    if (!coupon) throw new NotFoundError('Coupon');

    await redemptionRepo.create({
      couponCode: upperCode,
      campaignId: campaign._id,
      userId: new Types.ObjectId(userId),
      orderId: new Types.ObjectId(orderId),
      cartId: cartId ? new Types.ObjectId(cartId) : undefined,
      discountType: coupon.discountType,
      discountAmount,
      currency: coupon.currency ?? 'INR',
      status: 'applied',
      appliedAt: new Date(),
    });

    await campaignRepo.incrementCouponRedemption(upperCode);
    logger.info(`[promotion] redeemed coupon ${upperCode} for user ${userId} (discount ₹${discountAmount})`);
  }

  /**
   * Revert a coupon redemption if the order is cancelled.
   */
  async revertRedemption(orderId: string): Promise<void> {
    const redemptions = await redemptionRepo.findByOrder(orderId);
    for (const r of redemptions) {
      await redemptionRepo.markReverted(r._id);
      await campaignRepo.decrementCouponRedemption(r.couponCode);
      logger.info(`[promotion] reverted coupon ${r.couponCode} for order ${orderId}`);
    }
  }

  async listMyRedemptions(userId: string) {
    return redemptionRepo.listByUser(userId);
  }

  // ─── Admin: Stats ────────────────────────────────────────────
  async stats() {
    return redemptionRepo.stats();
  }

  async listRedemptions(filter: Record<string, unknown> = {}, page = 1, limit = 20) {
    return redemptionRepo.paginate(filter, page, limit);
  }

  // ─── Helpers ──────────────────────────────────────────────────
  private computeDiscountAmount(coupon: ICoupon, dto: ValidateCouponDTO): number {
    if (coupon.discountType === 'free_shipping') return 0; // shipping handled separately

    if (coupon.scope === 'cart') {
      let amount: number;
      if (coupon.discountType === 'percent') {
        amount = dto.cartSubtotal * (coupon.discountValue / 100);
      } else if (coupon.discountType === 'flat') {
        amount = coupon.discountValue;
      } else if (coupon.discountType === 'per_unit') {
        amount = coupon.discountValue * (dto.itemCount ?? dto.items.reduce((s, i) => s + i.quantity, 0));
      } else {
        amount = 0;
      }
      // Cap discount at cart subtotal
      amount = Math.min(amount, dto.cartSubtotal);
      // Cap at maxDiscountAmount if set
      if (coupon.maxDiscountAmount !== undefined) amount = Math.min(amount, coupon.maxDiscountAmount);
      return amount;
    }

    // For category/product/variant/seller scope — sum matching items
    const matchingItemsTotal = dto.items
      .filter((i) => {
        if (coupon.scope === 'product') return coupon.targetIds?.some((t) => t.toString() === i.productId);
        if (coupon.scope === 'variant') return coupon.targetIds?.some((t) => t.toString() === i.variantId);
        if (coupon.scope === 'category') {
          return (i.categoryIds ?? []).some((c) => coupon.targetIds?.some((t) => t.toString() === c));
        }
        if (coupon.scope === 'seller') return coupon.targetIds?.some((t) => t.toString() === i.sellerId);
        return false;
      })
      .reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

    let amount = 0;
    if (coupon.discountType === 'percent') {
      amount = matchingItemsTotal * (coupon.discountValue / 100);
    } else if (coupon.discountType === 'flat') {
      amount = Math.min(coupon.discountValue, matchingItemsTotal);
    } else if (coupon.discountType === 'per_unit') {
      const matchingQty = dto.items
        .filter((i) => {
          if (coupon.scope === 'product') return coupon.targetIds?.some((t) => t.toString() === i.productId);
          if (coupon.scope === 'variant') return coupon.targetIds?.some((t) => t.toString() === i.variantId);
          if (coupon.scope === 'category') {
            return (i.categoryIds ?? []).some((c) => coupon.targetIds?.some((t) => t.toString() === c));
          }
          if (coupon.scope === 'seller') return coupon.targetIds?.some((t) => t.toString() === i.sellerId);
          return false;
        })
        .reduce((s, i) => s + i.quantity, 0);
      amount = coupon.discountValue * matchingQty;
    }

    if (coupon.maxDiscountAmount !== undefined) amount = Math.min(amount, coupon.maxDiscountAmount);
    return amount;
  }
}

export const promotionService = new PromotionService();
