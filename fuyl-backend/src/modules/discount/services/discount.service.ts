import { DiscountRepository } from '../repositories/discount.repository';
import { RedemptionRepository } from '../repositories/redemption.repository';
import {
  BadRequestError,
  NotFoundError,
  ConflictError,
  ForbiddenError,
} from '../../../shared/errors';
import { logger } from '../../../config/logger';
import { Types } from 'mongoose';
import { CreateDiscountDTO, UpdateDiscountDTO, ValidateCouponDTO } from '../validators';
import { ICoupon } from '../models/discount.model';
import { fromPaise, toPaise } from '../../../shared/utils';

const discountRepo = new DiscountRepository();
const redemptionRepo = new RedemptionRepository();

export interface CouponValidationResult {
  valid: boolean;
  reason?: string;
  discountAmount?: number;
  discountType?: string;
  couponCode: string;
  discountId?: string;
  buyXGetY?: { qualifyingSets: number; discountedUnits: number };
}

class DiscountService {
  // ─── Admin: Discounts ─────────────────────────────────────────
  async createDiscount(dto: CreateDiscountDTO) {
    // Normalize coupon codes to uppercase
    const coupons = (dto.coupons ?? []).map((c) => ({
      ...c,
      code: c.code.toUpperCase(),
      startsAt: c.startsAt ? new Date(c.startsAt) : new Date(dto.startsAt),
      endsAt: c.endsAt ? new Date(c.endsAt) : (dto.endsAt ? new Date(dto.endsAt) : undefined),
      redemptionsCount: 0,
    }));

    // Verify uniqueness of coupon codes within this discount
    const codes = new Set(coupons.map((c) => c.code));
    if (codes.size !== coupons.length) {
      throw new BadRequestError('Duplicate coupon codes in payload');
    }

    // Verify codes don't exist in another discount
    for (const c of coupons) {
      const existing = await discountRepo.findByCouponCode(c.code);
      if (existing) throw new ConflictError(`Coupon code "${c.code}" already exists`);
    }

    return discountRepo.create({
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

  async getDiscount(id: string) {
    const c = await discountRepo.findById(id);
    if (!c) throw new NotFoundError('Discount');
    return c;
  }

  async listDiscounts(page = 1, limit = 20, filter: Record<string, unknown> = {}) {
    return discountRepo.findAll(filter, page, limit);
  }

  async listActive() {
    return discountRepo.findActive();
  }

  async listFeatured() {
    return discountRepo.findFeatured();
  }

  async updateDiscount(id: string, dto: UpdateDiscountDTO) {
    const patch: Record<string, unknown> = { ...dto };
    if (dto.startsAt !== undefined) patch.startsAt = new Date(dto.startsAt);
    if (dto.endsAt !== undefined) patch.endsAt = dto.endsAt ? new Date(dto.endsAt) : undefined;
    if (dto.customerIds !== undefined) patch.customerIds = dto.customerIds.map((id) => new Types.ObjectId(id));
    if (dto.coupons !== undefined) {
      const current = await this.getDiscount(id);
      // Re-validate codes
      for (const c of dto.coupons) {
        const upper = c.code.toUpperCase();
        const other = await discountRepo.findByCouponCode(upper);
        if (other && other._id.toString() !== id) {
          throw new ConflictError(`Coupon code "${upper}" already exists in another discount`);
        }
      }
      patch.coupons = dto.coupons.map((c: any) => ({
        ...c,
        code: c.code.toUpperCase(),
        redemptionsCount: current.coupons.find((existing) => existing.code === c.code.toUpperCase())?.redemptionsCount ?? 0,
        startsAt: c.startsAt ? new Date(c.startsAt) : new Date(),
        endsAt: c.endsAt ? new Date(c.endsAt) : undefined,
      }));
    }
    const updated = await discountRepo.update(id, patch);
    if (!updated) throw new NotFoundError('Discount');
    return updated;
  }

  async deleteDiscount(id: string) {
    await discountRepo.delete(id);
  }

  // ─── Customer-facing: Validate + Redeem ──────────────────────
  // userId is optional — checkout lets a not-yet-identified guest validate
  // a coupon before an account exists. The per-user redemption check below
  // is skipped in that case (nothing to check yet) and is re-verified for
  // real once this same code is re-validated with a resolved userId at
  // checkout.service.ts's preview()/placeOrder() time.
  async validateCoupon(userId: string | undefined, dto: ValidateCouponDTO): Promise<CouponValidationResult> {
    const code = dto.code.toUpperCase().trim();
    const discount = await discountRepo.findByCouponCode(code);
    if (!discount) {
      return { valid: false, reason: 'Coupon code not found', couponCode: code };
    }

    // Discount-level gate — previously only the coupon subdocument's own
    // isActive/dates were checked here, so a coupon on a draft/paused
    // discount (or one outside the discount's own date window) could still
    // validate successfully. Found in the integration audit, fixed here.
    const now = new Date();
    if (discount.status !== 'active' || !discount.isActive) {
      return { valid: false, reason: 'This discount is not currently active', couponCode: code };
    }
    if (discount.startsAt > now) {
      return { valid: false, reason: 'This discount has not started yet', couponCode: code };
    }
    if (discount.endsAt && discount.endsAt < now) {
      return { valid: false, reason: 'This discount has ended', couponCode: code };
    }

    const coupon = discount.coupons.find((c) => c.code === code);
    if (!coupon || !coupon.isActive) {
      return { valid: false, reason: 'Coupon is inactive', couponCode: code };
    }
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

    // Per-user limit — read from the atomic counter (authoritative; incremented
    // at redeem). Reliably blocks a user from reusing a coupon on a later order.
    if (userId && coupon.maxRedemptionsPerUser !== undefined) {
      const userCount = await redemptionRepo.getUserRedemptionCount(userId, code);
      if (userCount >= coupon.maxRedemptionsPerUser) {
        return { valid: false, reason: 'You have already used this coupon', couponCode: code };
      }
    }

    // First-order only: when dto.isFirstOrder is not supplied by the caller
    // (e.g. storefront cart validation), compute it server-side from order history
    // so first-time buyers aren't incorrectly shown a rejection.
    if (coupon.isFirstOrderOnly) {
      let isFirstOrder = dto.isFirstOrder;
      if (isFirstOrder === undefined && userId) {
        const { orderService } = await import('../../order/services/order.service');
        isFirstOrder = !(await orderService.hasOrders(userId));
      }
      if (!isFirstOrder) {
        return { valid: false, reason: 'Coupon valid only on first order', couponCode: code };
      }
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
      discountId: discount._id.toString(),
      buyXGetY: coupon.discountType === 'buy_x_get_y' ? this.getBuyXGetYSummary(coupon, dto) : undefined,
    };
  }

  /**
   * Finalize a coupon redemption at checkout time. Records the redemption and
   * increments the discount counter. Called by the checkout module after order placement.
   */
  async redeem(userId: string, code: string, orderId: string, discountAmount: number, cartId?: string): Promise<void> {
    const upperCode = code.toUpperCase().trim();
    const discount = await discountRepo.findByCouponCode(upperCode);
    if (!discount) throw new NotFoundError('Coupon');

    const coupon = discount.coupons.find((c) => c.code === upperCode);
    if (!coupon) throw new NotFoundError('Coupon');

    try {
      await redemptionRepo.create({
        couponCode: upperCode,
        discountId: discount._id,
        userId: new Types.ObjectId(userId),
        orderId: new Types.ObjectId(orderId),
        cartId: cartId ? new Types.ObjectId(cartId) : undefined,
        discountType: coupon.discountType,
        discountAmount,
        currency: coupon.currency ?? 'INR',
        status: 'applied',
        appliedAt: new Date(),
      });
    } catch (err) {
      // Unique {orderId, couponCode} index: this order already redeemed this
      // coupon (a retried/replayed checkout) — idempotent no-op, don't
      // double-count.
      if ((err as { code?: number })?.code === 11000) {
        logger.warn(`[discount] duplicate redemption for order ${orderId}, coupon ${upperCode} — skipping`);
        return;
      }
      throw err;
    }

    // Atomic per-user claim: keeps the per-user counter accurate (never past
    // maxRedemptionsPerUser) so validateCoupon reliably blocks reuse on later
    // orders. A false result means a concurrent burst raced past validation —
    // bounded, logged; the counter itself never overshoots.
    const claimedUserSlot = await redemptionRepo.claimUserSlot(userId, upperCode, coupon.maxRedemptionsPerUser);
    if (!claimedUserSlot) {
      logger.warn(`[discount] per-user limit reached in race for coupon ${upperCode}, user ${userId}`);
    }

    // Capped increment: never drives the global counter past maxRedemptionsGlobal,
    // so validateCoupon keeps rejecting once the cap is genuinely reached even
    // if a concurrent burst slipped a few redemptions through validation.
    await discountRepo.incrementCouponRedemption(upperCode, coupon.maxRedemptionsGlobal);
    logger.info(`[discount] redeemed coupon ${upperCode} for user ${userId} (discount ₹${discountAmount})`);
  }

  /**
   * Revert a coupon redemption if the order is cancelled.
   */
  async revertRedemption(orderId: string): Promise<void> {
    const redemptions = await redemptionRepo.findByOrder(orderId);
    for (const r of redemptions) {
      await redemptionRepo.markReverted(r._id);
      await discountRepo.decrementCouponRedemption(r.couponCode);
      await redemptionRepo.releaseUserSlot(r.userId, r.couponCode);
      logger.info(`[discount] reverted coupon ${r.couponCode} for order ${orderId}`);
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
    if (coupon.discountType === 'buy_x_get_y') return this.computeBuyXGetYAmount(coupon, dto);

    if (coupon.scope === 'cart') {
      let amountPaise: number;
      const cartSubtotalPaise = toPaise(dto.cartSubtotal);
      if (coupon.discountType === 'percent') {
        amountPaise = Math.round((cartSubtotalPaise * coupon.discountValue) / 100);
      } else if (coupon.discountType === 'flat') {
        amountPaise = toPaise(coupon.discountValue);
      } else if (coupon.discountType === 'per_unit') {
        amountPaise = toPaise(coupon.discountValue) * (dto.itemCount ?? dto.items.reduce((s, i) => s + i.quantity, 0));
      } else {
        amountPaise = 0;
      }
      amountPaise = Math.min(amountPaise, cartSubtotalPaise);
      if (coupon.maxDiscountAmount !== undefined) amountPaise = Math.min(amountPaise, toPaise(coupon.maxDiscountAmount));
      return fromPaise(amountPaise);
    }

    // For product/variant scope — sum matching items
    const matchingItemsTotal = dto.items
      .filter((i) => {
        if (coupon.scope === 'product') return coupon.targetIds?.some((t) => t.toString() === i.productId);
        if (coupon.scope === 'variant') return coupon.targetIds?.some((t) => t.toString() === i.variantId);
        return false;
      })
      .reduce((sum, i) => sum + toPaise(i.unitPrice) * i.quantity, 0);

    let amountPaise = 0;
    if (coupon.discountType === 'percent') {
      amountPaise = Math.round((matchingItemsTotal * coupon.discountValue) / 100);
    } else if (coupon.discountType === 'flat') {
      amountPaise = Math.min(toPaise(coupon.discountValue), matchingItemsTotal);
    } else if (coupon.discountType === 'per_unit') {
      const matchingQty = dto.items
        .filter((i) => {
          if (coupon.scope === 'product') return coupon.targetIds?.some((t) => t.toString() === i.productId);
          if (coupon.scope === 'variant') return coupon.targetIds?.some((t) => t.toString() === i.variantId);
          return false;
        })
        .reduce((s, i) => s + i.quantity, 0);
      amountPaise = toPaise(coupon.discountValue) * matchingQty;
    }

    if (coupon.maxDiscountAmount !== undefined) amountPaise = Math.min(amountPaise, toPaise(coupon.maxDiscountAmount));
    return fromPaise(amountPaise);
  }

  private getBuyXGetYSummary(coupon: ICoupon, dto: ValidateCouponDTO) {
    const buyIds = new Set((coupon.buyTargetIds ?? []).map((id) => id.toString()));
    const getIds = new Set((coupon.getTargetIds ?? []).map((id) => id.toString()));
    const buyQuantity = coupon.buyQuantity ?? 1;
    const getQuantity = coupon.getQuantity ?? 1;
    const samePool = buyIds.size === getIds.size && [...buyIds].every((id) => getIds.has(id));
    const qualifyingQty = dto.items.filter((item) => buyIds.has(item.productId)).reduce((sum, item) => sum + item.quantity, 0);
    const qualifyingSets = Math.floor(qualifyingQty / (samePool ? buyQuantity + getQuantity : buyQuantity));
    const availableRewardQty = dto.items.filter((item) => getIds.has(item.productId)).reduce((sum, item) => sum + item.quantity, 0);
    return { qualifyingSets, discountedUnits: Math.min(availableRewardQty, qualifyingSets * getQuantity) };
  }

  private computeBuyXGetYAmount(coupon: ICoupon, dto: ValidateCouponDTO): number {
    const summary = this.getBuyXGetYSummary(coupon, dto);
    if (summary.discountedUnits <= 0) return 0;
    const getIds = new Set((coupon.getTargetIds ?? []).map((id) => id.toString()));
    const rewardUnitPrices = dto.items
      .filter((item) => getIds.has(item.productId))
      .flatMap((item) => Array.from({ length: item.quantity }, () => item.unitPrice))
      .sort((a, b) => a - b)
      .slice(0, summary.discountedUnits);
    let amountPaise = Math.round(
      (rewardUnitPrices.reduce((sum, price) => sum + toPaise(price), 0) * coupon.discountValue) / 100
    );
    if (coupon.maxDiscountAmount !== undefined) amountPaise = Math.min(amountPaise, toPaise(coupon.maxDiscountAmount));
    return fromPaise(Math.min(amountPaise, toPaise(dto.cartSubtotal)));
  }
}

export const discountService = new DiscountService();
