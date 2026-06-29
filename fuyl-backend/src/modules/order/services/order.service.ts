import { OrderRepository } from '../repositories/order.repository';
import { ReturnRepository, RefundRepository, InvoiceRepository } from '../repositories/return.repository';
import { CatalogService } from '../../catalog/services/catalog.service';
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
}

export class OrderService {
  async create(customerId: string, dto: CreateOrderDTO) {
    // Fetch product details + prices from catalog
    const items: any[] = [];
    let subtotal = 0;
    const sellerIds = new Set<string>();

    for (const item of dto.items) {
      const product = await catalogService.getProduct(item.productId);
      if (!product.isPublished) throw new BadRequestError(`Product "${product.name}" is not available`);

      const priceInfo = await catalogService.getPrice(item.productId, item.variantId);
      const variant = item.variantId ? await catalogService.getVariant(item.variantId) : null;

      const unitPrice = priceInfo.price;
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;
      if (product.sellerId) sellerIds.add(product.sellerId.toString());

      items.push({
        productId: new mongoose.Types.ObjectId(item.productId),
        variantId: item.variantId ? new mongoose.Types.ObjectId(item.variantId) : undefined,
        name: product.name,
        sku: variant?.sku ?? `PROD-${item.productId.slice(-6)}`,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        discount: 0,
        tax: 0,
        currency: priceInfo.currency,
        image: product.media?.find((m: any) => m.isPrimary)?.url ?? product.media?.[0]?.url,
      });
    }

    const orderNumber = await nextNumber('FUL');
    const shipping = 0; // TODO: wire to shipping module
    const tax = 0;      // TODO: wire to pricing module
    const grandTotal = subtotal + shipping + tax;

    const order = await orderRepo.create({
      orderNumber,
      customerId: new mongoose.Types.ObjectId(customerId),
      sellerIds: Array.from(sellerIds).map((id) => new mongoose.Types.ObjectId(id)),
      items,
      status: OrderStatus.PENDING,
      currency: 'INR',
      subtotal,
      discountTotal: 0,
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
    });

    eventBus.publish(Events.ORDER_PLACED, { orderId: order.id, userId: customerId, amount: grandTotal });
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
    const shipping = 0;
    const tax = 0;
    const grandTotal = totalPrice + shipping + tax;

    const orderNumber = await nextNumber('FUL');
    const shippingAddr = input.shippingAddress;
    const billingAddr = input.billingAddress ?? input.shippingAddress;

    // Fetch product for name/sku
    const product = await catalogService.getProduct(input.productId);
    const variant = input.variantId ? await catalogService.getVariant(input.variantId) : null;

    const order = await orderRepo.create({
      orderNumber,
      customerId: new mongoose.Types.ObjectId(input.customerId),
      sellerIds: product.sellerId ? [product.sellerId] : [],
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
      paymentStatus: input.razorpayPaymentId ? PaymentStatus.SUCCESS : PaymentStatus.PENDING,
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
    });

    // Emit events on key transitions
    if (dto.status === OrderStatus.SHIPPED) {
      eventBus.publish(Events.ORDER_SHIPPED, { orderId, userId: order.customerId.toString(), trackingNumber: dto.trackingNumber });
    } else if (dto.status === OrderStatus.DELIVERED) {
      eventBus.publish(Events.ORDER_DELIVERED, { orderId, userId: order.customerId.toString() });
    } else if (dto.status === OrderStatus.COMPLETED) {
      eventBus.publish(Events.ORDER_COMPLETED, {
        orderId, userId: order.customerId.toString(), amount: order.grandTotal,
      });
    }

    return updated;
  }

  async cancel(orderId: string, reason: string, actorId: string) {
    const order = await this.getById(orderId);
    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.DELIVERED) {
      throw new ConflictError('Cannot cancel a delivered/completed order — use returns instead');
    }
    if (order.status === OrderStatus.CANCELLED) throw new ConflictError('Order already cancelled');

    const updated = await orderRepo.update(orderId, {
      status: OrderStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledReason: reason,
      cancelledBy: new Types.ObjectId(actorId),
      paymentStatus: order.paymentStatus === PaymentStatus.SUCCESS ? PaymentStatus.REFUNDED : PaymentStatus.PENDING,
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
    }
    // For 'original' refunds, would call payment module to issue Razorpay refund
    // (handled in payment module)

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
}

export const orderService = new OrderService();
