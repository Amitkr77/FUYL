import { OrderRepository } from '../repositories/order.repository';
import { ReturnRepository, RefundRepository, InvoiceRepository } from '../repositories/return.repository';
import { CatalogService } from '../../catalog/services/catalog.service';
import { pricingService } from '../../pricing/services/pricing.service';
import { inventoryService } from '../../inventory/services/inventory.service';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
} from '../../../shared/errors';
import { OrderStatus, PaymentStatus, PaymentMethod } from '../../../shared/enums';
import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { logger } from '../../../config/logger';
import { nextNumber } from '../utils/counter';
import { CreateOrderDTO, UpdateStatusDTO, CreateReturnDTO, UpdateReturnDTO } from '../validators';
import mongoose, { Types } from 'mongoose';

const orderRepo = new OrderRepository();
const returnRepo = new ReturnRepository();
const refundRepo = new RefundRepository();
const invoiceRepo = new InvoiceRepository();
const catalogService = new CatalogService();

export interface CreateFromSubscriptionInput {
  subscriptionId: string;
  customerId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  shippingAddress: any;
  billingAddress?: any;
  cycleNumber: number;
  paymentMethod: typeof PaymentMethod[keyof typeof PaymentMethod];
  razorpayPaymentId?: string;
  cfPaymentId?: string;
}

/** Server-computed checkout values. These are intentionally not part of the
 * public create-order validator: only CheckoutService may supply them. */
export interface CheckoutOrderAdjustments {
  discountTotal?: number;
  couponCode?: string;
  walletRedemption?: number;
  loyaltyRedemptionReference?: string;
}

export class OrderService {
  private async inventorySellerId(productId: string, variantId?: string): Promise<string | undefined> {
    const stocks = await inventoryService.getStock(productId, variantId);
    return stocks.find((stock) => variantId
      ? stock.variantId?.toString() === variantId
      : !stock.variantId,
    )?.sellerId.toString();
  }

  async create(customerId: string, dto: CreateOrderDTO & CheckoutOrderAdjustments) {
    // Fetch product details + prices from catalog
    const items: any[] = [];
    let subtotal = 0;
    const sellerIds = new Set<string>();

    let tax = 0;
    for (const item of dto.items) {
      const product = await catalogService.getProduct(item.productId);
      if (!product.isPublished) throw new BadRequestError(`Product "${product.name}" is not available`);

      const priceInfo = await catalogService.getPrice(item.productId, item.variantId);
      const variant = item.variantId ? await catalogService.getVariant(item.variantId) : null;
      const sellerId = await this.inventorySellerId(item.productId, item.variantId);

      const unitPrice = priceInfo.price;
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;
      if (sellerId) sellerIds.add(sellerId);

      let itemTax = 0;
      if (product.isTaxable) {
        const taxResult = await pricingService.computeTax(unitPrice, item.quantity, {
          sellerId,
          state: dto.shippingAddress.state,
          country: dto.shippingAddress.country,
        });
        itemTax = taxResult.totalTax;
      }
      tax += itemTax;

      items.push({
        productId: new mongoose.Types.ObjectId(item.productId),
        variantId: item.variantId ? new mongoose.Types.ObjectId(item.variantId) : undefined,
        name: product.name,
        sku: variant?.sku ?? `PROD-${item.productId.slice(-6)}`,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        discount: 0,
        tax: itemTax,
        currency: priceInfo.currency,
        image: product.media?.find((m: any) => m.isPrimary)?.url ?? product.media?.[0]?.url,
      });
    }

    const orderNumber = await nextNumber('FUL');
    // Shipping charge is computed upstream by the checkout service (Shiprocket
    // rate for the destination pincode) and passed in; defaults to 0.
    const shipping = dto.shippingTotal ?? 0;
    const discountTotal = Math.min(
      Math.max(0, dto.discountTotal ?? 0),
      subtotal + tax
    );
    const grandTotal = Math.max(0, subtotal + shipping + tax - discountTotal);

    const affiliateFields: Record<string, unknown> = {};
    if ((dto as any).affiliateId)              affiliateFields.affiliateId              = new mongoose.Types.ObjectId((dto as any).affiliateId);
    if ((dto as any).affiliateAttributionId)   affiliateFields.affiliateAttributionId   = new mongoose.Types.ObjectId((dto as any).affiliateAttributionId);
    if ((dto as any).affiliateAttributionMethod) affiliateFields.affiliateAttributionMethod = (dto as any).affiliateAttributionMethod;

    const order = await orderRepo.create({
      orderNumber,
      customerId: new mongoose.Types.ObjectId(customerId),
      sellerIds: Array.from(sellerIds).map((id) => new mongoose.Types.ObjectId(id)),
      items,
      status: OrderStatus.PENDING,
      currency: 'INR',
      subtotal,
      discountTotal,
      taxTotal: tax,
      shippingTotal: shipping,
      grandTotal,
      paymentStatus: PaymentStatus.PENDING,
      paymentMethod: dto.paymentMethod,
      shippingAddress: dto.shippingAddress,
      billingAddress: dto.billingAddress ?? dto.shippingAddress,
      isSubscriptionOrder: false,
      timeline: [{ status: OrderStatus.PENDING, at: new Date(), note: 'Order placed' }],
      placedAt: new Date(),
      notes: dto.notes,
      metadata: {
        couponCode: dto.couponCode,
        walletRedemption: dto.walletRedemption ?? 0,
        loyaltyRedemptionReference: dto.loyaltyRedemptionReference,
      },
      ...affiliateFields,
    });

    // BUG FIXED (found live end-to-end testing with Redis actually running
    // — this handler never fired to completion in earlier passes since the
    // notification worker needs a real queue): the notification subscriber
    // for this event had no orderNumber/itemCount/paymentMethod to work
    // with, so it hardcoded a fake "order number" (sliced from the raw
    // Mongo _id — customers would see e.g. "98BBD73A" instead of the real
    // "FUL-2026-00008"), always showed "1 item" regardless of cart size,
    // and always claimed "razorpay" regardless of how the order was
    // actually paid. Passing the real values through here is cheaper than
    // having the notification handler re-fetch the order.
    eventBus.publish(Events.ORDER_PLACED, {
      orderId: order.id,
      userId: customerId,
      amount: grandTotal,
      orderNumber,
      itemCount: items.length,
      paymentMethod: dto.paymentMethod,
      subtotal,
      discountTotal,
      walletRedemption: dto.walletRedemption ?? 0,
      couponCode: dto.couponCode,
    });
    return order;
  }

  /**
   * Create an order from a subscription billing cycle.
   * Called by subscription.billing.service.spawnOrder().
   */
  async createFromSubscription(input: CreateFromSubscriptionInput) {
    const unitPrice = input.unitPrice;
    const discountedPrice = Math.round(unitPrice * (1 - input.discountPercent / 100) * 100) / 100;
    const totalPrice = Math.round(discountedPrice * input.quantity * 100) / 100;
    const shipping = 0; // TODO: wire to shipping module once it exists

    const orderNumber = await nextNumber('FUL');
    const shippingAddr = input.shippingAddress;
    const billingAddr = input.billingAddress ?? input.shippingAddress;

    // Fetch product for name/sku
    const product = await catalogService.getProduct(input.productId);
    const variant = input.variantId ? await catalogService.getVariant(input.variantId) : null;
    const sellerId = await this.inventorySellerId(input.productId, input.variantId);

    let tax = 0;
    if (product.isTaxable) {
      const taxResult = await pricingService.computeTax(discountedPrice, input.quantity, {
        sellerId,
        state: shippingAddr?.state,
        country: shippingAddr?.country,
      });
      tax = taxResult.totalTax;
    }
    const grandTotal = totalPrice + shipping + tax;

    const order = await orderRepo.create({
      orderNumber,
      customerId: new mongoose.Types.ObjectId(input.customerId),
      sellerIds: sellerId ? [new mongoose.Types.ObjectId(sellerId)] : [],
      items: [{
        productId: new mongoose.Types.ObjectId(input.productId),
        variantId: input.variantId ? new mongoose.Types.ObjectId(input.variantId) : undefined,
        name: product.name,
        sku: variant?.sku ?? `PROD-${input.productId.slice(-6)}`,
        quantity: input.quantity,
        unitPrice: discountedPrice,
        totalPrice,
        discount: Math.round((unitPrice - discountedPrice) * input.quantity * 100) / 100,
        tax,
        currency: 'INR',
        image: product.media?.find((m: any) => m.isPrimary)?.url ?? product.media?.[0]?.url,
        subscriptionId: new mongoose.Types.ObjectId(input.subscriptionId),
      }],
      status: OrderStatus.CONFIRMED,        // subscription orders auto-confirm
      currency: 'INR',
      subtotal: totalPrice,
      discountTotal: Math.round((unitPrice - discountedPrice) * input.quantity * 100) / 100,
      taxTotal: tax,
      shippingTotal: shipping,
      grandTotal,
      paymentStatus: (input.cfPaymentId || input.razorpayPaymentId) ? PaymentStatus.SUCCESS : PaymentStatus.PENDING,
      paymentMethod: input.paymentMethod,
      razorpayPaymentId: input.razorpayPaymentId,
      shippingAddress: shippingAddr,
      billingAddress: billingAddr,
      isSubscriptionOrder: true,
      subscriptionId: new mongoose.Types.ObjectId(input.subscriptionId),
      deliveryCycleNumber: input.cycleNumber,
      timeline: [
        { status: OrderStatus.PENDING, at: new Date(), note: 'Auto-generated from subscription billing' },
        { status: OrderStatus.CONFIRMED, at: new Date(), note: `Cycle ${input.cycleNumber}` },
      ],
      placedAt: new Date(),
      confirmedAt: new Date(),
      notes: `Subscription cycle ${input.cycleNumber}`,
    });

    // Auto-generate invoice
    await this.generateInvoice(order.id);

    eventBus.publish(Events.ORDER_PLACED, {
      orderId: order.id,
      userId: input.customerId,
      amount: grandTotal,
      isSubscriptionOrder: true,
      orderNumber,
      itemCount: 1,
      paymentMethod: input.paymentMethod,
    });
    logger.info(`[order] created from subscription ${input.subscriptionId} cycle ${input.cycleNumber} → ${order.orderNumber}`);
    return order;
  }

  async getById(id: string) {
    const order = await orderRepo.findById(id);
    if (!order) throw new NotFoundError('Order');
    return order;
  }

  async getByOrderNumber(orderNumber: string) {
    const order = await orderRepo.findByOrderNumber(orderNumber);
    if (!order) throw new NotFoundError('Order');
    return order;
  }

  async listMine(customerId: string, status?: string) {
    const filter = status ? { status } : {};
    return orderRepo.findByCustomer(customerId, filter);
  }

  async listAll(page = 1, limit = 20, filter: Record<string, unknown> = {}) {
    return orderRepo.paginate(filter, page, limit);
  }

  async listBySubscription(subscriptionId: string) {
    return orderRepo.findBySubscription(subscriptionId);
  }

  /**
   * BUG FIXED (found live end-to-end testing the checkout flow): nothing in
   * the payment module ever transitioned order.paymentStatus away from its
   * creation-time default of 'pending' — not on a successful wallet debit,
   * not on Razorpay signature verification, not on the Razorpay webhook,
   * not on refund. A wallet payment could fully succeed (payment record
   * status:'success', wallet correctly debited) while the order it paid for
   * stayed paymentStatus:'pending' forever. Called from payment.service.ts
   * at every point a payment's status actually changes.
   */
  async updatePaymentStatus(orderId: string, paymentStatus: typeof PaymentStatus[keyof typeof PaymentStatus]) {
    // When a pending order's payment succeeds, auto-confirm it — a paid order
    // should never show as "Pending" to the customer.
    if (paymentStatus === PaymentStatus.SUCCESS) {
      const order = await orderRepo.findById(orderId);
      if (order && order.status === OrderStatus.PENDING) {
        const updated = await orderRepo.appendTimeline(
          orderId,
          { status: OrderStatus.CONFIRMED, note: 'Payment confirmed' },
          { paymentStatus, confirmedAt: new Date() }
        );
        eventBus.publish(Events.ORDER_CONFIRMED, {
          orderId, userId: order.customerId.toString(), orderNumber: order.orderNumber,
        });
        return updated;
      }
    }
    return orderRepo.update(orderId, { paymentStatus });
  }

  async updateStatus(orderId: string, dto: UpdateStatusDTO, actorId?: string) {
    const order = await this.getById(orderId);
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.COMPLETED) {
      throw new ConflictError(`Cannot change status of order in ${order.status} state`);
    }

    const patch: Partial<typeof order> = {};
    const now = new Date();
    switch (dto.status) {
      case OrderStatus.CONFIRMED: patch.confirmedAt = now; break;
      case OrderStatus.PACKED: patch.confirmedAt = patch.confirmedAt ?? now; patch.packedAt = now; break;
      case OrderStatus.SHIPPED:
        patch.packedAt = patch.packedAt ?? now;
        patch.shippedAt = now;
        if (dto.trackingNumber) patch.trackingNumber = dto.trackingNumber;
        if (dto.trackingUrl) patch.trackingUrl = dto.trackingUrl;
        if (dto.carrier) patch.carrier = dto.carrier;
        break;
      case OrderStatus.DELIVERED: patch.deliveredAt = now; break;
      case OrderStatus.COMPLETED: patch.completedAt = now; break;
      case OrderStatus.CANCELLED:
        throw new BadRequestError('Use the cancel endpoint to cancel an order');
    }

    const updated = await orderRepo.appendTimeline(orderId, {
      status: dto.status,
      note: dto.note,
      actor: actorId ? new Types.ObjectId(actorId) : undefined,
    }, patch);

    // Emit events on key transitions
    // BUG FIXED (found live, same class as ORDER_PLACED above): the
    // ORDER_SHIPPED/ORDER_DELIVERED notification handlers fabricate a fake
    // "order number" by slicing the raw Mongo _id whenever the real one
    // isn't in the event payload — neither publish call here ever included
    // it. Passing orderNumber/carrier through directly.
    if (dto.status === OrderStatus.CONFIRMED) {
      eventBus.publish(Events.ORDER_CONFIRMED, { orderId, userId: order.customerId.toString(), orderNumber: order.orderNumber });
    } else if (dto.status === OrderStatus.SHIPPED) {
      eventBus.publish(Events.ORDER_SHIPPED, {
        orderId, userId: order.customerId.toString(), trackingNumber: dto.trackingNumber,
        orderNumber: order.orderNumber, carrier: dto.carrier,
      });
    } else if (dto.status === OrderStatus.DELIVERED) {
      eventBus.publish(Events.ORDER_DELIVERED, {
        orderId,
        userId:           order.customerId.toString(),
        orderNumber:      order.orderNumber,
        subtotal:         order.subtotal,
        discountTotal:    order.discountTotal,
        shippingTotal:    order.shippingTotal,
        taxTotal:         order.taxTotal,
        walletRedemption: (order.metadata as any)?.walletRedemption ?? 0,
        grandTotal:       order.grandTotal,
      });
    } else if (dto.status === OrderStatus.COMPLETED) {
      eventBus.publish(Events.ORDER_COMPLETED, {
        orderId, userId: order.customerId.toString(), amount: order.grandTotal, orderNumber: order.orderNumber,
      });
    }

    return updated;
  }

  /**
   * Reconcile an order whose shipment was returned to origin (undelivered).
   * Marks the order RETURNED and, for a prepaid paid order, auto-initiates a
   * full refund (COD orders were never charged, so nothing to refund). Called
   * from the shipping module when a shipment hits returned_to_origin.
   */
  async handleRtoReturn(orderId: string) {
    const order = await this.getById(orderId);
    if (order.status === OrderStatus.RETURNED || order.status === OrderStatus.CANCELLED) return order;

    if (order.paymentStatus === PaymentStatus.SUCCESS || order.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED) {
      try {
        const { paymentService } = await import('../../payment/services/payment.service');
        const { PaymentRepository } = await import('../../payment/repositories/payment.repository');
        const payments = await new PaymentRepository().findByOrder(orderId);
        const refundable = payments.find(
          (p) => p.status === PaymentStatus.SUCCESS || p.status === PaymentStatus.PARTIALLY_REFUNDED
        );
        if (refundable) {
          await paymentService.refund('system', {
            paymentId: refundable.id,
            reason: 'Shipment returned to origin (undelivered)',
          });
        }
      } catch (err) {
        // Refund failure must not block marking the order returned — surface
        // for manual reconciliation instead.
        logger.error(`[order] RTO refund failed for order ${orderId} — needs manual review`, err);
      }
    }

    // Single atomic write: appendTimeline sets both the timeline entry and the
    // status field in one findByIdAndUpdate — avoids a crash leaving the order
    // in RETURNED status with no timeline entry (the previous double-write).
    const updated = await orderRepo.appendTimeline(orderId, {
      status: OrderStatus.RETURNED,
      note: 'Shipment returned to origin (undelivered)',
    });
    eventBus.publish(Events.ORDER_RETURNED, { orderId, userId: order.customerId.toString(), orderNumber: order.orderNumber });
    return updated;
  }

  async cancel(orderId: string, reason: string, actorId: string) {
    const order = await this.getById(orderId);
    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED) {
      throw new ConflictError('Cannot cancel a delivered/completed order — use returns instead');
    }
    if (order.status === OrderStatus.CANCELLED) throw new ConflictError('Order already cancelled');

    // BUG FIXED (found live end-to-end testing, right after fixing the
    // paymentStatus sync bug above — that fix is what exposed this one:
    // paymentStatus used to be permanently stuck at 'pending', so the
    // `paymentStatus === SUCCESS` branch below was never actually
    // reachable). This previously just relabeled paymentStatus to
    // 'refunded' on cancellation — no wallet credit, no Razorpay refund
    // call, nothing. The customer's money was never returned even though
    // every record claimed it was. Now it drives a real refund through
    // payment.service.ts (which itself updates order.paymentStatus).
    if (order.paymentStatus === PaymentStatus.SUCCESS || order.paymentStatus === PaymentStatus.PARTIALLY_REFUNDED) {
      try {
        const { paymentService } = await import('../../payment/services/payment.service');
        const { PaymentRepository } = await import('../../payment/repositories/payment.repository');
        const paymentRepo2 = new PaymentRepository();
        const payments = await paymentRepo2.findByOrder(orderId);
        // Refund EVERY refundable payment, not just the first — a split order
        // (e.g. wallet + gateway) has multiple payment records and each must be
        // returned. Isolate failures per-payment so one gateway hiccup doesn't
        // skip the others; a failure is logged for manual reconciliation.
        const refundable = payments.filter(
          (p) => p.status === PaymentStatus.SUCCESS || p.status === PaymentStatus.PARTIALLY_REFUNDED
        );
        for (const p of refundable) {
          try {
            await paymentService.refund(actorId, {
              paymentId: p.id,
              reason: `Order cancelled: ${reason}`,
            });
          } catch (perPaymentErr) {
            logger.error(
              `[order] REFUND FAILED for payment ${p.id} on cancelled order ${orderId} — needs manual reconciliation`,
              perPaymentErr
            );
          }
        }
      } catch (err) {
        logger.error(`[order] failed to refund payment for cancelled order ${orderId}`, err);
        // Cancellation still proceeds below — paymentStatus is left exactly
        // as payment.service.ts's refund() call last set it (untouched if
        // the refund never ran), so this failure isn't silently masked as
        // a false "refunded".
      }
    }

    const updated = await orderRepo.update(orderId, {
      status: OrderStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledReason: reason,
      cancelledBy: new Types.ObjectId(actorId),
    });
    await orderRepo.appendTimeline(orderId, {
      status: OrderStatus.CANCELLED,
      note: reason,
      actor: new Types.ObjectId(actorId),
    });

    eventBus.publish(Events.ORDER_CANCELLED, { orderId, userId: order.customerId.toString(), amount: order.grandTotal });
    return updated;
  }

  // ─── Returns ───────────────────────────────────────────────────
  async createReturn(customerId: string, dto: CreateReturnDTO) {
    const order = await this.getById(dto.orderId);
    if (order.customerId.toString() !== customerId) throw new ForbiddenError('Not your order');
    if (order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestError('Returns only allowed for delivered/completed orders');
    }

    // Refund requests are accepted ONLY for seal-damaged products, and every
    // returned item must carry photo proof of the damaged seal (the validator
    // requires at least one image per item; this enforces the condition).
    if (dto.items.some((i) => i.condition !== 'damaged')) {
      throw new BadRequestError('Refunds can only be requested for seal-damaged products — select the damaged condition and attach a photo of the damaged seal.');
    }
    if (dto.items.some((i) => !i.images || i.images.length === 0)) {
      throw new BadRequestError('A photo of the seal-damaged product is required for each item in a refund request.');
    }

    const returnNumber = await nextNumber('RET');
    const refundAmount = dto.items.reduce((sum, item) => {
      const orderItem = order.items.find((oi: any) =>
        oi.productId.toString() === item.productId &&
        (!item.variantId || oi.variantId?.toString() === item.variantId)
      );
      if (!orderItem) throw new BadRequestError(`Item ${item.productId} not in order`);
      return sum + (orderItem as any).totalPrice * (item.quantity / (orderItem as any).quantity);
    }, 0);

    const ret = await returnRepo.create({
      returnNumber,
      orderId: new Types.ObjectId(dto.orderId),
      customerId: new Types.ObjectId(customerId),
      items: dto.items.map((i: any) => ({
        ...i,
        productId: new Types.ObjectId(i.productId),
        variantId: i.variantId ? new Types.ObjectId(i.variantId) : undefined,
      })),
      status: 'requested',
      refundAmount,
      refundMethod: dto.refundMethod,
      requestedAt: new Date(),
    });

    eventBus.publish(Events.ORDER_RETURNED, { returnId: ret.id, orderId: dto.orderId, userId: customerId });
    return ret;
  }

  async updateReturn(returnId: string, dto: UpdateReturnDTO, actorId: string) {
    const ret = await returnRepo.findById(returnId);
    if (!ret) throw new NotFoundError('Return');
    const patch: any = {};
    if (dto.status) patch.status = dto.status;
    if (dto.rejectedReason) patch.rejectedReason = dto.rejectedReason;

    const now = new Date();
    switch (dto.status) {
      case 'approved': patch.approvedAt = now; break;
      case 'rejected': patch.rejectedAt = now; break;
      case 'pickup_scheduled': patch.pickupScheduledAt = now; break;
      case 'picked_up': patch.pickedUpAt = now; break;
      case 'received': patch.receivedAt = now; break;
      case 'refunded':
        patch.refundedAt = now;
        // Auto-issue refund
        await this.issueRefund({
          orderId: ret.orderId.toString(),
          customerId: ret.customerId.toString(),
          returnId: ret.id,
          amount: ret.refundAmount,
          method: ret.refundMethod,
          reason: `Return ${ret.returnNumber} approved`,
          actorId,
        });
        break;
    }

    return returnRepo.update(returnId, patch);
  }

  async listMyReturns(customerId: string) {
    return returnRepo.findByCustomer(customerId);
  }

  async listAllReturns(page = 1, limit = 20) {
    return returnRepo.paginate({}, page, limit);
  }

  // ─── Refunds ───────────────────────────────────────────────────
  async issueRefund(input: {
    orderId: string;
    customerId: string;
    returnId?: string | Types.ObjectId;
    amount: number;
    method: 'wallet' | 'original' | 'split';
    reason: string;
    actorId: string;
  }) {
    const refundNumber = await nextNumber('RFD');
    const refund = await refundRepo.create({
      refundNumber,
      orderId: new Types.ObjectId(input.orderId),
      customerId: new Types.ObjectId(input.customerId),
      returnId: input.returnId ? new Types.ObjectId(input.returnId.toString()) : undefined,
      amount: input.amount,
      currency: 'INR',
      method: input.method,
      status: 'pending',
      reason: input.reason,
      processedBy: new Types.ObjectId(input.actorId),
    });

    // For wallet refunds, credit the customer's wallet via walletService
    // (cross-module service call is OK here because we're inside a transactional flow)
    if (input.method === 'wallet' || input.method === 'split') {
      try {
        const { WalletService } = await import('../../wallet/services/wallet.service');
        const walletService = new WalletService();
        const result = await walletService.credit({
          userId: input.customerId,
          amount: input.amount,
          source: 'order_refund',
          description: `Refund for order ${input.orderId}`,
          referenceType: 'refund',
          referenceId: refund.id,
        });
        await refundRepo.update(refund.id, {
          status: 'processed',
          processedAt: new Date(),
          walletTransactionId: result.transaction._id,
        });
      } catch (err) {
        logger.error(`[order] failed to credit wallet for refund ${refund.id}`, err);
        await refundRepo.update(refund.id, { status: 'failed' });
      }
    } else if (input.method === 'original') {
      // BUG FIXED (found in the fixing/testing pass): this branch previously
      // only had a comment claiming the payment module "would" issue the
      // Razorpay refund — nothing ever called it, so the refund record was
      // created and left status:'pending' forever with no money ever
      // actually returned to the customer's original payment method.
      // Dynamic import avoids a circular import: payment.service.ts imports
      // OrderService directly, so a static import here would cycle.
      try {
        const { PaymentService } = await import('../../payment/services/payment.service');
        const { PaymentRepository } = await import('../../payment/repositories/payment.repository');
        const { PaymentStatus } = await import('../../../shared/enums');
        const paymentRepo2 = new PaymentRepository();
        const paymentService = new PaymentService();
        const payments = await paymentRepo2.findByOrder(input.orderId);
        const successfulPayment = payments.find((p) => p.status === PaymentStatus.SUCCESS || p.status === PaymentStatus.PARTIALLY_REFUNDED);
        if (!successfulPayment) {
          throw new Error('No successful payment found for this order to refund');
        }
        const updatedPayment = await paymentService.refund(input.actorId, {
          paymentId: successfulPayment.id,
          amount: input.amount,
          reason: input.reason,
        });
        await refundRepo.update(refund.id, {
          status: 'processed',
          processedAt: new Date(),
          razorpayRefundId: (updatedPayment as any)?.razorpayRefundId,
        });
      } catch (err) {
        logger.error(`[order] failed to issue original-method refund for refund ${refund.id}`, err);
        await refundRepo.update(refund.id, { status: 'failed' });
      }
    }

    return refund;
  }

  // ─── Invoices ──────────────────────────────────────────────────
  async generateInvoice(orderId: string): Promise<any> {
    const order = await this.getById(orderId);
    const invoiceNumber = await nextNumber('INV');
    return invoiceRepo.create({
      invoiceNumber,
      orderId: new Types.ObjectId(orderId),
      customerId: order.customerId,
      sellerId: order.sellerIds?.[0],
      amount: order.subtotal,
      tax: order.taxTotal,
      total: order.grandTotal,
      currency: order.currency,
      status: 'issued',
      issuedAt: new Date(),
    });
  }

  async listInvoicesByOrder(orderId: string) {
    return invoiceRepo.findByOrder(orderId);
  }

  async getInvoice(id: string) {
    const invoice = await invoiceRepo.findById(id);
    if (!invoice) throw new NotFoundError('Invoice');
    return invoice;
  }

  // ─── Admin ─────────────────────────────────────────────────────
  async stats() {
    return orderRepo.statsForAdmin();
  }

  /** True if the customer has placed at least one non-cancelled order. */
  async hasOrders(userId: string): Promise<boolean> {
    return orderRepo.existsByCustomer(userId, { status: { $ne: OrderStatus.CANCELLED } });
  }
}

export const orderService = new OrderService();
