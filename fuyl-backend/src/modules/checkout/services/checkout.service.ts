import { SiteSettingsModel } from '../../admin/models/siteSettings.model';
import { cartService } from '../../cart/services/cart.service';
import { orderService } from '../../order/services/order.service';
import { inventoryService } from '../../inventory/services/inventory.service';
import { discountService } from '../../discount/services/discount.service';
import { pricingService } from '../../pricing/services/pricing.service';
import { walletService } from '../../wallet/services/wallet.service';
import { catalogService } from '../../catalog/services/catalog.service';
import { shippingService } from '../../shipping/services/shipping.service';
import { cashbackService } from '../../cashback/services/cashback.service';
import { loyaltyService } from '../../loyalty/services/loyalty.service';
import { trackingService } from '../../affiliate/services/tracking.service';
import {
  BadRequestError,
  NotFoundError,
  PaymentRequiredError,
  ForbiddenError,
} from '../../../shared/errors';
import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { logger } from '../../../config/logger';
import { OrderStatus, PaymentStatus, PaymentMethod } from '../../../shared/enums';
import { CheckoutDTO } from '../validators';
import { clampPaise, fromPaise, toPaise } from '../../../shared/utils';

// Converts a product/variant weight to grams for cart-weight totals — variants
// are always stored in grams, but a product's own shippingInfo.weight can be
// entered in any of these units.
const WEIGHT_TO_GRAMS: Record<string, number> = { g: 1, kg: 1000, lb: 453.592, oz: 28.3495 };
function toGrams(weight: number, unit = 'g'): number {
  return weight * (WEIGHT_TO_GRAMS[unit] ?? 1);
}

class CheckoutService {
  /**
   * Pre-flight: validate cart, address, payment method, and compute final totals.
   * Returns a "checkout summary" the client can display before confirming.
   */
  async preview(userId: string, dto: CheckoutDTO) {
    const cart = await this.resolveCart(userId, dto.cartId);
    if (cart.items.length === 0) throw new BadRequestError('Cart is empty');

    // Validate that the chosen payment method is enabled in site settings
    const siteSettings = await SiteSettingsModel.findOne({});
    if (siteSettings) {
      const { onlinePaymentEnabled, codEnabled } = siteSettings.payment;
      if (dto.paymentMethod === PaymentMethod.COD && !codEnabled) {
        throw new BadRequestError('Cash on Delivery is currently not available');
      }
      if (dto.paymentMethod !== PaymentMethod.COD && !onlinePaymentEnabled) {
        throw new BadRequestError('Online payment is currently not available');
      }
    }

    const shippingAddress = await this.resolveAddress(userId, dto.shippingAddressId, dto.shippingAddress);
    const billingAddress = dto.billingAddress
      ? dto.billingAddress
      : dto.billingAddressId
        ? await this.resolveAddress(userId, dto.billingAddressId)
        : shippingAddress;

    // 1. Compute pricing quote (tax + price books)
    const quoteItems = cart.items.map((i) => ({
      productId: i.productId.toString(),
      variantId: i.variantId?.toString(),
      quantity: i.quantity,
      basePrice: i.unitPrice,
      isTaxable: i.isTaxable,
      taxRate: (i as any).taxRate,
    }));
    const quote = await pricingService.quote(quoteItems, {
      state: shippingAddress.state,
      country: shippingAddress.country,
    });

    // 2. Validate coupon (if provided)
    let couponDiscount = 0;
    let couponValidation: {
      valid: boolean;
      reason?: string;
      discountAmount?: number;
      discountType?: string;
      couponCode: string;
    } | null = null;
    if (dto.couponCode || cart.couponCode) {
      const code = dto.couponCode ?? cart.couponCode!;
      const isFirstOrder = !(await orderService.hasOrders(userId));
      const couponItems = await Promise.all(cart.items.map(async (i) => {
        const stocks = await inventoryService.getStock(i.productId.toString(), i.variantId?.toString());
        const inventoryOwner = stocks[0]?.sellerId?.toString();
        if (!inventoryOwner) throw new BadRequestError(`Inventory is not configured for ${i.productId.toString()}`);
        return {
          productId: i.productId.toString(),
          variantId: i.variantId?.toString(),
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        };
      }));
      couponValidation = await discountService.validateCoupon(userId, {
        code,
        cartSubtotal: quote.subtotal,
        isFirstOrder,
        items: couponItems,
      });
      if (couponValidation.valid) {
        couponDiscount = couponValidation.discountAmount ?? 0;
      } else {
        throw new BadRequestError(couponValidation.reason ?? 'Discount code is not valid');
      }
    }

    // 3. Compute wallet redemption (for split payment)
    let walletRedemption = 0;
    if (dto.walletRedemptionAmount && dto.walletRedemptionAmount > 0) {
      const balance = await walletService.getBalance(userId);
      if (toPaise(balance.balance) < toPaise(dto.walletRedemptionAmount)) {
        throw new PaymentRequiredError(`Insufficient wallet balance (have ₹${balance.balance}, requested ₹${dto.walletRedemptionAmount})`);
      }
      walletRedemption = dto.walletRedemptionAmount;
    }

    // 3b. Preview loyalty points redemption (monetary value only — not debited yet)
    let loyaltyRedemption = 0;
    let loyaltyPointsToRedeem = 0;
    if (dto.loyaltyPointsToRedeem && dto.loyaltyPointsToRedeem > 0) {
      const loyaltyPreview = await loyaltyService.previewRedemption(userId, quote.grandTotal - couponDiscount).catch(() => null);
      if (loyaltyPreview?.canRedeem) {
        loyaltyPointsToRedeem = Math.min(dto.loyaltyPointsToRedeem, loyaltyPreview.pointsToRedeem);
        const config = await loyaltyService.getActiveConfig();
        if (config) loyaltyRedemption = loyaltyService.computeRedemptionValue(config, loyaltyPointsToRedeem);
      }
    }

    // 4. Shipping charge (Shiprocket rate for the destination pincode).
    const shippingResult = await this.computeShipping(cart, shippingAddress, dto.paymentMethod);
    if (!shippingResult.serviceable) {
      throw new BadRequestError("Sorry, we don't deliver to this pincode yet.");
    }
    const quotedShippingCharge = shippingResult.cost;
    const freeShipping = couponValidation?.valid && couponValidation.discountType === 'free_shipping';
    const shippingDiscount = freeShipping ? quotedShippingCharge : 0;
    const shippingChargePaise = clampPaise(toPaise(quotedShippingCharge) - toPaise(shippingDiscount));
    const grandTotalPaise = clampPaise(
      toPaise(quote.grandTotal) - toPaise(couponDiscount) + shippingChargePaise
    );
    let walletRedemptionPaise = toPaise(walletRedemption);
    if (walletRedemptionPaise > grandTotalPaise) walletRedemptionPaise = grandTotalPaise;
    walletRedemption = fromPaise(walletRedemptionPaise);
    // Loyalty deduction comes after wallet, cannot exceed remaining amount
    const maxLoyaltyPaise = clampPaise(grandTotalPaise - walletRedemptionPaise);
    if (toPaise(loyaltyRedemption) > maxLoyaltyPaise) {
      const config = await loyaltyService.getActiveConfig();
      if (config) {
        // Only whole redemption blocks are legal. Reduce both the monetary
        // deduction and point debit together so the customer is never charged
        // more points than the amount shown in checkout.
        const redeemValuePaise = toPaise(config.redeemValue);
        const blocks = redeemValuePaise > 0 ? Math.floor(maxLoyaltyPaise / redeemValuePaise) : 0;
        loyaltyPointsToRedeem = Math.min(loyaltyPointsToRedeem, blocks * config.redeemPoints);
        loyaltyRedemption = loyaltyService.computeRedemptionValue(config, loyaltyPointsToRedeem);
      } else {
        loyaltyPointsToRedeem = 0;
        loyaltyRedemption = 0;
      }
    }
    const loyaltyRedemptionPaise = toPaise(loyaltyRedemption);
    const remainingAfterWalletPaise = clampPaise(
      grandTotalPaise - walletRedemptionPaise - loyaltyRedemptionPaise
    );

    // 5. Cashback preview — show customer what they'll earn on this order.
    // Cashback is calculated on the original subtotal (before discount and wallet).
    const cashbackItems = cart.items.map((item) => ({
      productId: item.productId.toString(),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));
    const cashbackPreview = await cashbackService.preview({
      userId,
      subtotal:   quote.subtotal,
      couponCode: dto.couponCode ?? (cart as any).couponCode,
      items:      cashbackItems,
    }).catch(() => ({ eligible: false, policies: [], totalCashback: 0 }));

    return {
      cart,
      shippingAddress,
      billingAddress,
      pricing: quote,
      coupon: couponValidation,
      couponDiscount,
      shippingDiscount: fromPaise(toPaise(shippingDiscount)),
      walletRedemption,
      loyaltyRedemption: fromPaise(loyaltyRedemptionPaise),
      loyaltyPointsToRedeem,
      shippingTotal: fromPaise(shippingChargePaise),
      grandTotal: fromPaise(grandTotalPaise),
      remainingToPay: fromPaise(remainingAfterWalletPaise),
      paymentMethod: dto.paymentMethod,
      cashback: cashbackPreview,
    };
  }

  /**
   * Shipping charge for the cart.
   *
   * Per-product shippingMode takes priority over carrier calculation:
   *   free     → item contributes ₹0 and 0g to totals
   *   fixed    → item contributes fixedShippingRate (once, not × qty)
   *   calculated (default) → weight is added to the carrier quote pool
   *
   * When the cart has a mix of fixed and calculated items, the carrier quote
   * covers only the calculated items' weight; fixed charges are summed
   * separately and added on top.
   */
  private async computeShipping(
    cart: { items: Array<{ productId: unknown; variantId?: unknown; quantity: number }> },
    shippingAddress: unknown,
    paymentMethod: string,
  ): Promise<{ serviceable: boolean; cost: number }> {
    const addr = shippingAddress as { pincode?: string; postalCode?: string };
    const pincode = addr.pincode ?? addr.postalCode;

    let fixedTotal = 0;
    let calculatedWeightGrams = 0;
    let hasCalculatedItems = false;

    for (const item of cart.items) {
      let product: Awaited<ReturnType<typeof catalogService.getProduct>> | null = null;
      try { product = await catalogService.getProduct(String(item.productId)); } catch { /* not found */ }

      const mode = product?.shippingInfo?.shippingMode ?? 'calculated';

      if (mode === 'free' || product?.shippingInfo?.isPhysical === false) {
        // free shipping or digital — contributes nothing
        continue;
      }

      if (mode === 'fixed') {
        fixedTotal += product?.shippingInfo?.fixedShippingRate ?? 0;
        continue;
      }

      // calculated — add weight to the carrier pool
      hasCalculatedItems = true;
      let unitWeight = 500;
      if (item.variantId) {
        try {
          const v = await catalogService.getVariant(item.variantId.toString());
          if (v?.weight) unitWeight = v.weight;
        } catch { /* fall back */ }
      } else if (product?.shippingInfo?.weight) {
        unitWeight = toGrams(product.shippingInfo.weight, product.shippingInfo.weightUnit);
      }
      calculatedWeightGrams += unitWeight * item.quantity;
    }

    // No carrier quote needed when there are no calculated items
    if (!hasCalculatedItems || !pincode) {
      return { serviceable: true, cost: fixedTotal };
    }

    const weightGrams = Math.max(100, calculatedWeightGrams);
    const paymentMode = paymentMethod === PaymentMethod.COD ? 'COD' : 'Prepaid';
    const quote = await shippingService.quoteRate({ pincode, weightGrams, paymentMode });
    if (quote.serviceable === false) return { serviceable: false, cost: 0 };
    return { serviceable: true, cost: (quote.cost ?? 0) + fixedTotal };
  }

  /**
   * Total shippable weight in grams — variant weight × qty, falling back to
   * the product's own shippingInfo.weight when the line has no variant
   * (variants are optional — see catalog/models/product.model.ts), and a
   * flat 500g/unit default when neither is set. A product explicitly marked
   * non-physical (digital) contributes 0g.
   */
  private async computeCartWeight(
    cart: { items: Array<{ productId: unknown; variantId?: unknown; quantity: number }> }
  ): Promise<number> {
    let total = 0;
    for (const item of cart.items) {
      let unit = 500;
      if (item.variantId) {
        try {
          const v = await catalogService.getVariant(item.variantId.toString());
          if (v?.weight) unit = v.weight;
        } catch { /* fall back to default weight */ }
      } else {
        try {
          const p = await catalogService.getProduct(String(item.productId));
          if (p?.shippingInfo?.isPhysical === false) unit = 0;
          else if (p?.shippingInfo?.weight) unit = toGrams(p.shippingInfo.weight, p.shippingInfo.weightUnit);
        } catch { /* fall back to default weight */ }
      }
      total += unit * item.quantity;
    }
    return Math.max(100, total);
  }

  /**
   * Execute checkout: place order, charge payment, reserve stock, dispatch events.
   * affiliationToken — value from the aff_token cookie set by the affiliate tracking redirect.
   */
  async placeOrder(userId: string, dto: CheckoutDTO, affiliationToken?: string) {
    const preview = await this.preview(userId, dto);

    // 1. Reserve inventory against the cart
    const itemsWithSeller = await Promise.all(
      preview.cart.items.map(async (i) => {
        const stocks = await inventoryService.getStock(i.productId.toString(), i.variantId?.toString());
        const inventoryOwner = stocks.find((stock) => i.variantId
          ? stock.variantId?.toString() === i.variantId.toString()
          : !stock.variantId,
        )?.sellerId.toString();
        if (!inventoryOwner) throw new BadRequestError(`Inventory is not configured for ${i.productId.toString()}`);
        return {
          productId: i.productId.toString(),
          variantId: i.variantId?.toString(),
          sellerId: inventoryOwner,
          unitPrice: i.unitPrice,
          quantity: i.quantity,
        };
      })
    );
    const reservationResult = await inventoryService.reserveStock({
      items: itemsWithSeller,
      cartId: preview.cart._id.toString(),
      userId,
      ttlMinutes: 30,
    });
    if (reservationResult.failed.length > 0) {
      throw new BadRequestError('Some items out of stock', reservationResult.failed);
    }

    // Resolve affiliate attribution from cookie token or coupon code (best-effort — must not block checkout).
    // Validate token format (UUID v4) before querying the DB to avoid unnecessary load from bad cookies.
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const validToken = affiliationToken && UUID_RE.test(affiliationToken) ? affiliationToken : undefined;
    const attribution = await trackingService.resolveForCheckout({
      attributionToken: validToken,
      couponCode:       dto.couponCode ?? (preview.cart as any).couponCode,
      userId,
    }).catch(() => null);

    // Steps 2–4 move money and create the order. Without a DB transaction
    // (needs a replica set), a failure between the wallet debit and a
    // successful order creation would otherwise leave the shopper debited with
    // no order. Wrap them so any failure up to and including order creation
    // compensates: re-credit the wallet and release the held stock, then
    // rethrow. Post-order bookkeeping (steps 5–7) is intentionally left outside
    // this boundary — once the order exists and payment is captured, those
    // failures must NOT reverse the order/payment (behavior unchanged).
    let walletDebited = false;
    let loyaltyDebited = false;
    let order;
    try {
      // 2. Debit wallet if split payment
      if (preview.walletRedemption > 0) {
        await walletService.debit({
          userId,
          amount: preview.walletRedemption,
          source: 'order_payment' as any,
          description: `Payment for order`,
          referenceType: 'cart',
          referenceId: preview.cart._id.toString(),
        });
        walletDebited = true;
      }

      // 2b. Debit loyalty points if redemption requested
      if ((preview as any).loyaltyPointsToRedeem > 0) {
        await loyaltyService.redeemPoints({
          userId,
          orderId: preview.cart._id.toString(), // temp ref — updated after order creation
          pointsRequested: (preview as any).loyaltyPointsToRedeem,
          orderTotal: preview.grandTotal,
        });
        loyaltyDebited = true;
      }

      // 3. Razorpay payment confirmation is handled asynchronously by the
      //    payment module's webhook (see payment/controllers/webhook.controller).

      // 4. Create the order
      order = await orderService.create(userId, {
        items: preview.cart.items.map((i) => ({
          productId: i.productId.toString(),
          variantId: i.variantId?.toString(),
          quantity: i.quantity,
        })),
        paymentMethod: dto.paymentMethod as any,
        shippingAddress: preview.shippingAddress as any,
        billingAddress: preview.billingAddress as any,
        shippingTotal: preview.shippingTotal,
        discountTotal: preview.pricing.discountTotal + preview.couponDiscount,
        couponCode: preview.coupon?.valid ? preview.coupon.couponCode : undefined,
        walletRedemption: preview.walletRedemption,
        // Redemption is debited before an order id exists. Persist its cart
        // reference so cancellation/return can reliably locate and restore it.
        loyaltyRedemptionReference: loyaltyDebited ? preview.cart._id.toString() : undefined,
        loyaltyRedemption: preview.loyaltyRedemption,
        loyaltyPointsRedeemed: loyaltyDebited ? preview.loyaltyPointsToRedeem : 0,
        cashbackSnapshot: preview.cashback,
        pricingSnapshot: {
          items: preview.pricing.items,
          subtotal: preview.pricing.subtotal,
          discountTotal: preview.pricing.discountTotal + preview.couponDiscount,
          taxTotal: preview.pricing.taxTotal,
          shippingTotal: preview.shippingTotal,
          grandTotal: preview.grandTotal,
        },
        notes: dto.notes,
        affiliateId:              attribution?.affiliateId,
        affiliateAttributionId:   attribution?.attributionId,
        affiliateAttributionMethod: attribution?.method,
      } as any);
      // Reservations are initially keyed to the cart because the order does not
      // exist yet. Link them immediately so shipment fulfilment and cancellation
      // settle the correct stock instead of allowing the TTL job to release it.
      await inventoryService.attachReservationsToOrder(
        preview.cart._id.toString(),
        order._id.toString()
      );
    } catch (err) {
      if (walletDebited) {
        try {
          await walletService.credit({
            userId,
            amount: preview.walletRedemption,
            source: 'refund' as any,
            description: 'Auto-reversal: checkout failed after wallet debit',
            referenceType: 'cart',
            referenceId: preview.cart._id.toString(),
          });
        } catch (compErr) {
          logger.error('[checkout] CRITICAL: wallet debit could not be auto-reversed', {
            userId, amount: preview.walletRedemption, cartId: preview.cart._id.toString(), error: compErr,
          });
        }
      }
      if (loyaltyDebited) {
        try {
          await loyaltyService.reverseRedeem(preview.cart._id.toString(), userId);
        } catch (compErr) {
          logger.error('[checkout] CRITICAL: loyalty debit could not be auto-reversed', {
            userId, cartId: preview.cart._id.toString(), error: compErr,
          });
        }
      }
      try {
        await inventoryService.releaseReservations({ cartId: preview.cart._id.toString() });
      } catch (relErr) {
        logger.warn('[checkout] failed to release reservations during rollback', relErr);
      }
      throw err;
    }

    // 5. Mark attribution as converted (best-effort)
    if (attribution) {
      trackingService.markConverted(attribution.attributionId, order._id.toString()).catch((err) => {
        logger.warn('[checkout] failed to mark attribution converted', { attributionId: attribution.attributionId, err });
      });
    }

    // 6. Apply coupon redemption
    if (preview.coupon?.valid) {
      await discountService.redeem(
        userId,
        preview.coupon.couponCode,
        order._id.toString(),
        preview.couponDiscount + (preview.shippingDiscount ?? 0),
        preview.cart._id.toString()
      );
    }

    // 7. Cashback earnings are created by the ORDER_PLACED event subscriber
    //    (cashback/services/eventSubscribers.service.ts) — do NOT call
    //    cashbackService.createEarnings() here as well, or every order gets
    //    credited twice (once per call path).

    // 8. Mark cart as converted
    await cartService.markConverted(preview.cart._id.toString(), order._id.toString());

    // 9. Release cart-level reservations — they're now associated with the order
    await inventoryService.releaseReservations({ cartId: preview.cart._id.toString() });

    logger.info(`[checkout] order ${order.orderNumber} placed for user ${userId} (total ₹${preview.grandTotal}, cashback ₹${preview.cashback.totalCashback})`);

    return {
      order,
      pricing: preview.pricing,
      couponDiscount: preview.couponDiscount,
      walletRedemption: preview.walletRedemption,
      shippingTotal: preview.shippingTotal,
      grandTotal: preview.grandTotal,
    };
  }

  private async resolveCart(userId: string, cartId?: string) {
    if (cartId) {
      const { CartRepository } = await import('../../cart/repositories/cart.repository');
      const cartRepo = new CartRepository();
      const cart = await cartRepo.findById(cartId);
      if (!cart) throw new NotFoundError('Cart');
      if (cart.userId?.toString() !== userId) throw new ForbiddenError('Cart does not belong to user');
      return cart;
    }
    const cart = await cartService.getCart({ userId });
    if (!cart) throw new NotFoundError('Cart');
    return cart;
  }

  private async resolveAddress(
    userId: string,
    addressId?: string,
    inline?: CheckoutDTO['shippingAddress']
  ) {
    if (inline) return inline;
    if (addressId) {
      const { customerService } = await import('../../customer/services/customer.service');
      const profile = await customerService.getOrCreateProfile(userId);
      const addr = profile.addresses.find((a) => a._id?.toString() === addressId);
      if (!addr) throw new NotFoundError('Address');
      return addr;
    }
    throw new BadRequestError('Either shippingAddress or shippingAddressId is required');
  }
}

export const checkoutService = new CheckoutService();
