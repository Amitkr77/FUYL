import { CartRepository } from '../repositories/cart.repository';
import { CatalogService } from '../../catalog/services/catalog.service';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../../shared/errors';
import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { queueService } from '../../../shared/services/queue.service';
import { logger } from '../../../config/logger';
import mongoose, { Types } from 'mongoose';
import { ICart, ICartItem } from '../models/cart.model';

const cartRepo = new CartRepository();
const catalogService = new CatalogService();

const ABANDONED_CART_THRESHOLD_MIN = 60; // 1 hour of inactivity

export interface CartOwner {
  userId?: string;
  guestId?: string;
}

class CartService {
  async getOrCreateCart(owner: CartOwner): Promise<ICart> {
    if (owner.userId) {
      let cart = await cartRepo.findByUser(owner.userId);
      if (cart) return cart;
      return cartRepo.create({
        userId: new Types.ObjectId(owner.userId),
        items: [],
        currency: 'INR',
      });
    }
    if (owner.guestId) {
      let cart = await cartRepo.findByGuest(owner.guestId);
      if (cart) return cart;
      return cartRepo.create({
        guestId: owner.guestId,
        items: [],
        currency: 'INR',
      });
    }
    throw new BadRequestError('Either userId or guestId required');
  }

  async getCart(owner: CartOwner): Promise<ICart | null> {
    if (owner.userId) return cartRepo.findByUser(owner.userId);
    if (owner.guestId) return cartRepo.findByGuest(owner.guestId);
    return null;
  }

  async addItem(owner: CartOwner, input: {
    productId: string;
    variantId?: string;
    quantity: number;
    subscriptionInterval?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
    subscriptionDiscountPercent?: number;
  }): Promise<ICart> {
    const product = await catalogService.getProduct(input.productId);
    if (!product.isPublished) throw new BadRequestError('Product not available');

    const priceInfo = await catalogService.getPrice(input.productId, input.variantId);
    const variant = input.variantId ? await catalogService.getVariant(input.variantId) : null;

    // If subscription, check subscribable + apply discount
    let unitPrice = priceInfo.price;
    if (input.subscriptionInterval) {
      const ok = await catalogService.isSubscribable(input.productId, input.variantId);
      if (!ok) throw new BadRequestError('Product is not eligible for subscription');
      if (input.subscriptionDiscountPercent && input.subscriptionDiscountPercent > 0) {
        unitPrice = Math.round(unitPrice * (1 - input.subscriptionDiscountPercent / 100) * 100) / 100;
      }
    }

    const cart = await this.getOrCreateCart(owner);

    // Check if same product/variant already in cart
    const existingIdx = cart.items.findIndex(
      (i) =>
        i.productId.toString() === input.productId &&
        (i.variantId?.toString() ?? '') === (input.variantId ?? '') &&
        (i.subscriptionInterval ?? '') === (input.subscriptionInterval ?? '')
    );

    const itemData: ICartItem = {
      productId: new Types.ObjectId(input.productId),
      variantId: input.variantId ? new Types.ObjectId(input.variantId) : undefined,
      name: product.name,
      sku: variant?.sku,
      slug: product.seo?.slug,
      image: product.media?.find((m: any) => m.isPrimary)?.url ?? product.media?.[0]?.url,
      unitPrice,
      quantity: input.quantity,
      currency: priceInfo.currency,
      isSubscribable: product.isSubscribable,
      addedAt: new Date(),
      subscriptionInterval: input.subscriptionInterval,
      subscriptionDiscountPercent: input.subscriptionDiscountPercent,
    };

    if (existingIdx >= 0) {
      cart.items[existingIdx].quantity += input.quantity;
      cart.items[existingIdx].unitPrice = unitPrice; // refresh price snapshot
    } else {
      cart.items.push(itemData);
    }

    await this.recomputeTotals(cart);
    cart.lastActivityAt = new Date();
    cart.abandonedReminderSentAt = undefined;
    const updated = await cart.save();
    return updated;
  }

  async updateItemQuantity(owner: CartOwner, productId: string, variantId: string | undefined, quantity: number): Promise<ICart> {
    const cart = await this.getOrCreateCart(owner);
    const idx = cart.items.findIndex(
      (i) => i.productId.toString() === productId && (i.variantId?.toString() ?? '') === (variantId ?? '')
    );
    if (idx < 0) throw new NotFoundError('Cart item');

    cart.items[idx].quantity = quantity;
    await this.recomputeTotals(cart);
    cart.lastActivityAt = new Date();
    return cart.save();
  }

  async removeItem(owner: CartOwner, productId: string, variantId?: string): Promise<ICart> {
    const cart = await this.getOrCreateCart(owner);
    cart.items = cart.items.filter(
      (i) => !(i.productId.toString() === productId && (i.variantId?.toString() ?? '') === (variantId ?? ''))
    );
    await this.recomputeTotals(cart);
    cart.lastActivityAt = new Date();
    return cart.save();
  }

  async clear(owner: CartOwner): Promise<void> {
    const cart = await this.getCart(owner);
    if (!cart) return;
    cart.items = [];
    cart.couponCode = undefined;
    cart.couponDiscount = 0;
    cart.appliedReferralCode = undefined;
    await this.recomputeTotals(cart);
    cart.lastActivityAt = new Date();
    await cart.save();
  }

  async applyCoupon(owner: CartOwner, couponCode: string): Promise<ICart> {
    // Coupon validation lives in the promotion module.
    // For now we record the code; checkout module will validate + apply discount at checkout.
    // The promotion module's promotion.service can also be called from here if needed.
    const cart = await this.getOrCreateCart(owner);
    if (cart.items.length === 0) throw new BadRequestError('Cart is empty');
    cart.couponCode = couponCode.toUpperCase().trim();
    cart.lastActivityAt = new Date();
    return cart.save();
  }

  async removeCoupon(owner: CartOwner): Promise<ICart> {
    const cart = await this.getOrCreateCart(owner);
    if (!cart) throw new NotFoundError('Cart');
    cart.couponCode = undefined;
    cart.couponDiscount = 0;
    await this.recomputeTotals(cart);
    return cart.save();
  }

  async applyReferral(owner: CartOwner, referralCode: string): Promise<ICart> {
    const cart = await this.getOrCreateCart(owner);
    if (cart.items.length === 0) throw new BadRequestError('Cart is empty');
    cart.appliedReferralCode = referralCode;
    cart.lastActivityAt = new Date();
    return cart.save();
  }

  async mergeGuestCartIntoUser(guestId: string, userId: string): Promise<ICart> {
    const guestCart = await cartRepo.findByGuest(guestId);
    if (!guestCart || guestCart.items.length === 0) {
      return this.getOrCreateCart({ userId });
    }
    const userCart = await this.getOrCreateCart({ userId });

    for (const item of guestCart.items) {
      const idx = userCart.items.findIndex(
        (i) =>
          i.productId.toString() === item.productId.toString() &&
          (i.variantId?.toString() ?? '') === (item.variantId?.toString() ?? '') &&
          (i.subscriptionInterval ?? '') === (item.subscriptionInterval ?? '')
      );
      if (idx >= 0) {
        userCart.items[idx].quantity += item.quantity;
      } else {
        userCart.items.push(item);
      }
    }
    if (!userCart.couponCode && guestCart.couponCode) userCart.couponCode = guestCart.couponCode;
    if (!userCart.appliedReferralCode && guestCart.appliedReferralCode) {
      userCart.appliedReferralCode = guestCart.appliedReferralCode;
    }

    await this.recomputeTotals(userCart);
    userCart.lastActivityAt = new Date();
    const saved = await userCart.save();

    // Delete guest cart
    await cartRepo.delete(guestCart._id);
    return saved;
  }

  async markConverted(cartId: string, orderId: string): Promise<void> {
    await cartRepo.markConverted(cartId, orderId);
  }

  /**
   * Scheduled job — find carts inactive for >60min and emit cart.abandoned events.
   */
  async scanAbandonedCarts(): Promise<number> {
    const carts = await cartRepo.findAbandoned(ABANDONED_CART_THRESHOLD_MIN, 200);
    let n = 0;
    for (const cart of carts) {
      const userId = cart.userId?.toString();
      if (!userId) continue; // skip guest carts for notifications
      eventBus.publish(Events.CART_ABANDONED, {
        userId,
        cartId: cart._id.toString(),
        itemCount: cart.itemCount,
      });
      await cartRepo.markReminderSent(cart._id);
      n++;
    }
    if (n > 0) logger.info(`[cart] emitted ${n} abandoned-cart events`);
    return n;
  }

  /**
   * Recompute subtotal / tax / grandTotal from items + coupon.
   * Tax is currently 0% — wire to the pricing module when available.
   */
  private async recomputeTotals(cart: ICart): Promise<void> {
    let subtotal = 0;
    let itemCount = 0;
    for (const item of cart.items) {
      subtotal += item.unitPrice * item.quantity;
      itemCount += item.quantity;
    }
    cart.subtotal = Math.round(subtotal * 100) / 100;
    cart.itemCount = itemCount;

    // Coupon discount (already computed by promotion module on apply)
    cart.discountTotal = cart.couponDiscount ?? 0;

    // Tax — placeholder 0% until pricing module is wired
    cart.taxTotal = 0;

    // Shipping — placeholder 0 until shipping module
    cart.shippingTotal = 0;

    cart.grandTotal = Math.max(0, cart.subtotal - cart.discountTotal + cart.taxTotal + cart.shippingTotal);
    cart.grandTotal = Math.round(cart.grandTotal * 100) / 100;
  }
}

export const cartService = new CartService();
