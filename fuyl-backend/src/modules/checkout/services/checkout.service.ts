import { cartService } from '../../cart/services/cart.service';
import { orderService } from '../../order/services/order.service';
import { inventoryService } from '../../inventory/services/inventory.service';
import { promotionService } from '../../promotion/services/promotion.service';
import { pricingService } from '../../pricing/services/pricing.service';
import { walletService } from '../../wallet/services/wallet.service';
import { catalogService } from '../../catalog/services/catalog.service';
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

    const grandTotal = quote.grandTotal - couponDiscount;
    const remainingAfterWallet = Math.max(0, grandTotal - walletRedemption);

    return {
      cart,
      shippingAddress,
      billingAddress,
      pricing: quote,
      coupon: couponValidation,
      couponDiscount,
      walletRedemption,
      grandTotal: Math.round(grandTotal * 100) / 100,
      remainingToPay: Math.round(remainingAfterWallet * 100) / 100,
      paymentMethod: dto.paymentMethod,
    };
  }

  /**
   * Execute checkout: place order, charge payment, reserve stock, dispatch events.
   */
  async placeOrder(userId: string, dto: CheckoutDTO) {
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
        notes: dto.notes,
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

    // 5. Apply coupon redemption
    if (preview.coupon?.valid && preview.couponDiscount > 0) {
      await promotionService.redeem(
        userId,
        preview.coupon.couponCode,
        order._id.toString(),
        preview.couponDiscount,
        preview.cart._id.toString()
      );
    }

    // 6. Mark cart as converted
    await cartService.markConverted(preview.cart._id.toString(), order._id.toString());

    // 7. Release cart-level reservations — they're now associated with the order
    await inventoryService.releaseReservations({ cartId: preview.cart._id.toString() });

    logger.info(`[checkout] order ${order.orderNumber} placed for user ${userId} (total ₹${preview.grandTotal})`);

    return {
      order,
      pricing: preview.pricing,
      couponDiscount: preview.couponDiscount,
      walletRedemption: preview.walletRedemption,
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
