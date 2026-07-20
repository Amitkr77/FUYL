import { CartRepository } from '../repositories/cart.repository';
import { CatalogService } from '../../catalog/services/catalog.service';
import { PlanRepository } from '../../subscription/repositories/plan.repository';
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
const planRepo = new PlanRepository();

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

  /**
   * Read → mutate → save with optimistic-concurrency retry. If a concurrent
   * write bumped the cart version between our read and save (VersionError),
   * re-fetch and re-apply the mutation on the latest state rather than losing
   * the update. The mutation must be idempotent w.r.t. re-application (all
   * callers here re-derive from the freshly-read cart, so they are).
   */
  private async mutateCart(
    owner: CartOwner,
    mutate: (cart: ICart) => void | Promise<void>
  ): Promise<ICart> {
    const MAX_ATTEMPTS = 3;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const cart = await this.getOrCreateCart(owner);
      await mutate(cart);
      try {
        return await cart.save();
      } catch (err) {
        if ((err as Error)?.name === 'VersionError' && attempt < MAX_ATTEMPTS) continue;
        throw err;
      }
    }
    // The loop always returns or throws; this satisfies the type checker.
    throw new Error('cart update failed after concurrent-modification retries');
  }

  async addItem(owner: CartOwner, input: {
    productId: string;
    variantId?: string;
    quantity: number;
    subscriptionInterval?: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  }): Promise<ICart> {
    const product = await catalogService.getProduct(input.productId);
    if (!product.isPublished) throw new BadRequestError('Product not available');

    const priceInfo = await catalogService.getPrice(input.productId, input.variantId);
    const variant = input.variantId ? await catalogService.getVariant(input.variantId) : null;

    // If subscription, check subscribable + apply discount. The discount is
    // ALWAYS derived server-side from the active plan for this interval — never
    // from client input — so a shopper can't set their own price.
    let unitPrice = priceInfo.price;
    let subscriptionDiscountPercent: number | undefined;
    if (input.subscriptionInterval) {
      const ok = await catalogService.isSubscribable(input.productId, input.variantId);
      if (!ok) throw new BadRequestError('Product is not eligible for subscription');
      const plan = await planRepo.findActiveByInterval(input.subscriptionInterval);
      subscriptionDiscountPercent = plan?.discountPercent ?? 0;
      if (subscriptionDiscountPercent > 0) {
        unitPrice = Math.round(unitPrice * (1 - subscriptionDiscountPercent / 100) * 100) / 100;
      }
    }

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
      isTaxable: product.isTaxable,
      addedAt: new Date(),
      subscriptionInterval: input.subscriptionInterval,
      subscriptionDiscountPercent,
    };

    // Re-applied against the freshly-read cart on each retry: if a concurrent
    // add already inserted this line, we increment the latest quantity instead
    // of overwriting it — no lost update.
    return this.mutateCart(owner, async (cart) => {
      const existingIdx = cart.items.findIndex(
        (i) =>
          i.productId.toString() === input.productId &&
          (i.variantId?.toString() ?? '') === (input.variantId ?? '') &&
          (i.subscriptionInterval ?? '') === (input.subscriptionInterval ?? '')
      );
      if (existingIdx >= 0) {
        cart.items[existingIdx].quantity += input.quantity;
        cart.items[existingIdx].unitPrice = unitPrice; // refresh price snapshot
      } else {
        cart.items.push(itemData);
      }
      await this.recomputeTotals(cart);
      cart.lastActivityAt = new Date();
      cart.abandonedReminderSentAt = undefined;
    });
  }

  async updateItemQuantity(owner: CartOwner, productId: string, variantId: string | undefined, quantity: number): Promise<ICart> {
    return this.mutateCart(owner, async (cart) => {
      const idx = cart.items.findIndex(
        (i) => i.productId.toString() === productId && (i.variantId?.toString() ?? '') === (variantId ?? '')
      );
      if (idx < 0) throw new NotFoundError('Cart item');

      cart.items[idx].quantity = quantity;
      await this.recomputeTotals(cart);
      cart.lastActivityAt = new Date();
    });
  }

  async removeItem(owner: CartOwner, productId: string, variantId?: string): Promise<ICart> {
    return this.mutateCart(owner, async (cart) => {
      cart.items = cart.items.filter(
        (i) => !(i.productId.toString() === productId && (i.variantId?.toString() ?? '') === (variantId ?? ''))
      );
      await this.recomputeTotals(cart);
      cart.lastActivityAt = new Date();
    });
  }

  async clear(owner: CartOwner): Promise<void> {
    const existing = await this.getCart(owner);
    if (!existing) return;
    await this.mutateCart(owner, async (cart) => {
      cart.items = [];
      cart.couponCode = undefined;
      cart.couponDiscount = 0;
      cart.appliedReferralCode = undefined;
      await this.recomputeTotals(cart);
      cart.lastActivityAt = new Date();
    });
  }

  async applyCoupon(owner: CartOwner, couponCode: string): Promise<ICart> {
    // Coupon validation lives in the promotion module.
    // For now we record the code; checkout module will validate + apply discount at checkout.
    // The promotion module's promotion.service can also be called from here if needed.
    return this.mutateCart(owner, (cart) => {
      if (cart.items.length === 0) throw new BadRequestError('Cart is empty');
      cart.couponCode = couponCode.toUpperCase().trim();
      cart.lastActivityAt = new Date();
    });
  }

  async removeCoupon(owner: CartOwner): Promise<ICart> {
    return this.mutateCart(owner, async (cart) => {
      cart.couponCode = undefined;
      cart.couponDiscount = 0;
      await this.recomputeTotals(cart);
    });
  }

  async applyReferral(owner: CartOwner, referralCode: string): Promise<ICart> {
    return this.mutateCart(owner, (cart) => {
      if (cart.items.length === 0) throw new BadRequestError('Cart is empty');
      cart.appliedReferralCode = referralCode;
      cart.lastActivityAt = new Date();
    });
  }

  async mergeGuestCartIntoUser(guestId: string, userId: string): Promise<ICart> {
    const guestCart = await cartRepo.findByGuest(guestId);
    if (!guestCart || guestCart.items.length === 0) {
      return this.getOrCreateCart({ userId });
    }
    const saved = await this.mutateCart({ userId }, async (userCart) => {
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
    });

    // Delete guest cart only after the merge has durably committed.
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
