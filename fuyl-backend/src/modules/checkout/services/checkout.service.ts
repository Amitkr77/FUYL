import { cartService } from '../../cart/services/cart.service';
import { orderService } from '../../order/services/order.service';
import { inventoryService } from '../../inventory/services/inventory.service';
import { promotionService } from '../../promotion/services/promotion.service';
import { pricingService } from '../../pricing/services/pricing.service';
import { walletService } from '../../wallet/services/wallet.service';
import { catalogService } from '../../catalog/services/catalog.service';
import { shippingService } from '../../shipping/services/shipping.service';
import { cashbackService } from '../../cashback/services/cashback.service';
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
    }));
    const quote = await pricingService.quote(quoteItems, {
      state: shippingAddress.state,
      country: shippingAddress.country,
    });

    // 2. Validate coupon (if provided)
    let couponDiscount = 0;
    let couponValidation: { valid: boolean; reason?: string; discountAmount?: number; couponCode: string } | null = null;
    if (dto.couponCode || cart.couponCode) {
      const code = dto.couponCode ?? cart.couponCode!;
      couponValidation = await promotionService.validateCoupon(userId, {
        code,
        cartSubtotal: quote.subtotal,
        items: cart.items.map((i) => ({
          productId: i.productId.toString(),
          variantId: i.variantId?.toString(),
          quantity: i.quantity,
          unitPrice: i.unitPrice,
        })),
      });
      if (couponValidation.valid) {
        couponDiscount = couponValidation.discountAmount ?? 0;
      }
    }

    // 3. Compute wallet redemption (for split payment)
    let walletRedemption = 0;
    if (dto.walletRedemptionAmount && dto.walletRedemptionAmount > 0) {
      const balance = await walletService.getBalance(userId);
      if (balance.balance < dto.walletRedemptionAmount) {
        throw new PaymentRequiredError(`Insufficient wallet balance (have ₹${balance.balance}, requested ₹${dto.walletRedemptionAmount})`);
      }
      walletRedemption = dto.walletRedemptionAmount;
    }

    // 4. Shipping charge (Shiprocket rate for the destination pincode).
    const shippingResult = await this.computeShipping(cart, shippingAddress, dto.paymentMethod);
    if (!shippingResult.serviceable) {
      throw new BadRequestError("Sorry, we don't deliver to this pincode yet.");
    }
    const shippingCharge = shippingResult.cost;

    const grandTotal = quote.grandTotal - couponDiscount + shippingCharge;
    const remainingAfterWallet = Math.max(0, grandTotal - walletRedemption);

    // 5. Cashback preview — show customer what they'll earn on this order
    const cashbackPreview = await cashbackService.preview({
      userId,
      subtotal:        quote.subtotal,
      walletRedemption,
      couponCode:      dto.couponCode ?? (cart as any).couponCode,
    }).catch(() => ({ eligible: false, policies: [], totalCashback: 0 }));

    return {
      cart,
      shippingAddress,
      billingAddress,
      pricing: quote,
      coupon: couponValidation,
      couponDiscount,
      walletRedemption,
      shippingTotal: Math.round(shippingCharge * 100) / 100,
      grandTotal: Math.round(grandTotal * 100) / 100,
      remainingToPay: Math.round(remainingAfterWallet * 100) / 100,
      paymentMethod: dto.paymentMethod,
      cashback: cashbackPreview,
    };
  }

  /** Shiprocket shipping charge for the cart's weight to the destination pincode. */
  private async computeShipping(
    cart: { items: Array<{ productId: unknown; variantId?: unknown; quantity: number }> },
    shippingAddress: unknown,
    paymentMethod: string,
  ): Promise<{ serviceable: boolean; cost: number }> {
    // Saved addresses use `postalCode`, inline checkout addresses use `pincode`.
    const addr = shippingAddress as { pincode?: string; postalCode?: string };
    const pincode = addr.pincode ?? addr.postalCode;
    if (!pincode) return { serviceable: true, cost: 0 };

    const weightGrams = await this.computeCartWeight(cart);
    const paymentMode = paymentMethod === PaymentMethod.COD ? 'COD' : 'Prepaid';
    const quote = await shippingService.quoteRate({ pincode, weightGrams, paymentMode });
    if (quote.serviceable === false) return { serviceable: false, cost: 0 };
    return { serviceable: true, cost: quote.cost ?? 0 };
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
        const product = await catalogService.getProduct(i.productId.toString());
        return {
          productId: i.productId.toString(),
          variantId: i.variantId?.toString(),
          sellerId: product.sellerId.toString(),
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
        notes: dto.notes,
        affiliateId:              attribution?.affiliateId,
        affiliateAttributionId:   attribution?.attributionId,
        affiliateAttributionMethod: attribution?.method,
      } as any);
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
          // The debit could not be reversed — must be reconciled manually.
          logger.error('[checkout] CRITICAL: wallet debit could not be auto-reversed', {
            userId,
            amount: preview.walletRedemption,
            cartId: preview.cart._id.toString(),
            error: compErr,
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
    if (preview.coupon?.valid && preview.couponDiscount > 0) {
      await promotionService.redeem(
        userId,
        preview.coupon.couponCode,
        order._id.toString(),
        preview.couponDiscount,
        preview.cart._id.toString()
      );
    }

    // 7. Create cashback earnings (best-effort — failure must not block the order)
    cashbackService.createEarnings({
      orderId:          order._id.toString(),
      userId,
      subtotal:         preview.pricing.subtotal,
      walletRedemption: preview.walletRedemption,
      couponCode:       preview.coupon?.couponCode,
    }).catch((err) => {
      logger.warn('[checkout] cashback earning creation failed (non-blocking)', { orderId: order._id.toString(), err });
    });

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
