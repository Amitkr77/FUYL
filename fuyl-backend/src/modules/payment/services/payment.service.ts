import { PaymentRepository, TransactionRepository } from '../repositories/payment.repository';
import { razorpayGateway } from '../utils/razorpay';
import { cashfreeGateway } from '../utils/cashfree';
import { OrderService } from '../../order/services/order.service';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../../shared/errors';
import { PaymentStatus, PaymentMethod } from '../../../shared/enums';
import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import { nextNumber } from '../../order/utils/counter';
import type { IPayment } from '../models/payment.model';
import { Types } from 'mongoose';

const paymentRepo = new PaymentRepository();
const txRepo = new TransactionRepository();
const orderService = new OrderService();

export class PaymentService {
  /**
   * Step 1: Create a Razorpay order for the customer to pay.
   * Returns the Razorpay order ID + the customer-side payload needed by the checkout UI.
   */
  async createPayment(customerId: string, orderId: string, method: typeof PaymentMethod[keyof typeof PaymentMethod]) {
    const order = await orderService.getById(orderId);
    if (order.customerId.toString() !== customerId) throw new BadRequestError('Not your order');
    if (order.paymentStatus === PaymentStatus.SUCCESS) throw new ConflictError('Order already paid');

    const paymentNumber = await nextNumber('PAY');

    if (method === PaymentMethod.COD) {
      // COD: no upfront payment — confirm the order immediately so the customer
      // never sees "Pending" status on a successfully placed COD order.
      const payment = await paymentRepo.create({
        paymentNumber,
        orderId: new Types.ObjectId(orderId),
        customerId: new Types.ObjectId(customerId),
        amount: order.grandTotal,
        currency: order.currency,
        method,
        status: PaymentStatus.PENDING,
        gateway: 'cod',
        attemptedAt: new Date(),
      });
      await txRepo.create({
        transactionNumber: await nextNumber('TXN'),
        paymentId: payment._id,
        orderId: payment.orderId,
        customerId: payment.customerId,
        type: 'authorization',
        amount: payment.amount,
        currency: payment.currency,
        method,
        status: PaymentStatus.PENDING,
        gateway: 'cod',
        description: `COD payment for order ${order.orderNumber}`,
      });
      // Auto-confirm — no prepayment needed for COD
      await orderService.updateStatus(orderId, { status: 'confirmed' as any, note: 'Order confirmed (Cash on Delivery)' });
      return { payment, cod: true };
    }

    if (method === PaymentMethod.WALLET) {
      // Wallet payment — debit immediately
      const { WalletService } = await import('../../wallet/services/wallet.service');
      const walletService = new WalletService();
      try {
        const result = await walletService.debit({
          userId: customerId,
          amount: order.grandTotal,
          source: 'order_payment',
          description: `Payment for order ${order.orderNumber}`,
          referenceType: 'order',
          referenceId: orderId,
        });
        const payment = await paymentRepo.create({
          paymentNumber,
          orderId: new Types.ObjectId(orderId),
          customerId: new Types.ObjectId(customerId),
          amount: order.grandTotal,
          currency: order.currency,
          method,
          status: PaymentStatus.SUCCESS,
          gateway: 'wallet',
          capturedAt: new Date(),
          metadata: { walletTransactionId: result.transaction._id },
        });
        await txRepo.create({
          transactionNumber: await nextNumber('TXN'),
          paymentId: payment._id,
          orderId: payment.orderId,
          customerId: payment.customerId,
          type: 'capture',
          amount: payment.amount,
          currency: payment.currency,
          method,
          status: PaymentStatus.SUCCESS,
          gateway: 'wallet',
          gatewayTransactionId: result.transaction._id.toString(),
          description: `Wallet payment for order ${order.orderNumber}`,
        });
        await orderService.updatePaymentStatus(orderId, PaymentStatus.SUCCESS);
        return { payment, wallet: true };
      } catch (err) {
        throw new BadRequestError(err instanceof Error ? err.message : 'Wallet payment failed');
      }
    }

    // Cashfree flow — create a Cashfree order and hand the session id to the
    // client SDK. `cfOrderId` (our unique payment number) is how we later
    // reconcile the payment on verify + webhook.
    const cfOrderId = paymentNumber;
    const cfOrder = await cashfreeGateway.createOrder({
      orderId: cfOrderId,
      amount: order.grandTotal, // rupees — Cashfree does NOT use paise
      currency: order.currency,
      customer: {
        id: customerId,
        phone: order.shippingAddress?.phone ?? '',
        name: order.shippingAddress?.fullName,
        // No email stored on the order; a valid-format placeholder keeps
        // Cashfree happy — our own notification module sends order emails.
        email: `cust-${customerId}@checkout.fuyl.in`,
      },
      returnUrl: `${env.clientUrl}/checkout/success?orderId=${orderId}`,
      notes: { orderId, customerId },
    });

    const payment = await paymentRepo.create({
      paymentNumber,
      orderId: new Types.ObjectId(orderId),
      customerId: new Types.ObjectId(customerId),
      amount: order.grandTotal,
      currency: order.currency,
      method,
      status: PaymentStatus.PENDING,
      gateway: 'cashfree',
      cfOrderId,
      paymentSessionId: cfOrder.payment_session_id,
      attemptedAt: new Date(),
    });

    await txRepo.create({
      transactionNumber: await nextNumber('TXN'),
      paymentId: payment._id,
      orderId: payment.orderId,
      customerId: payment.customerId,
      type: 'authorization',
      amount: payment.amount,
      currency: payment.currency,
      method,
      status: PaymentStatus.PENDING,
      gateway: 'cashfree',
      gatewayTransactionId: cfOrderId,
      description: `Cashfree order created for ${order.orderNumber}`,
    });

    return {
      payment,
      cashfree: {
        orderId: cfOrderId,
        paymentSessionId: cfOrder.payment_session_id,
        amount: order.grandTotal,
        currency: order.currency,
        mode: env.cashfree.mode,
      },
    };
  }

  /**
   * Step 2: after the shopper completes payment in the Cashfree SDK, confirm
   * by fetching the order status server-side (Cashfree has no client-side
   * signature to verify). The webhook is the backstop if this never fires.
   */
  async verifyPayment(customerId: string, opts: { cfOrderId: string }) {
    const payment = await paymentRepo.findByCfOrderId(opts.cfOrderId);
    if (!payment) throw new NotFoundError('Payment');
    if (payment.customerId.toString() !== customerId) throw new BadRequestError('Not your payment');
    if (payment.status === PaymentStatus.SUCCESS) return payment; // idempotent

    const cfOrder = await cashfreeGateway.getOrder(opts.cfOrderId);
    if (cfOrder.order_status !== 'PAID') {
      throw new BadRequestError('Payment not completed');
    }

    const payments = await cashfreeGateway.getOrderPayments(opts.cfOrderId);
    const successful = payments.find((p) => p.payment_status === 'SUCCESS');
    return this.markPaymentSuccess(payment, successful?.cf_payment_id);
  }

  /** Shared success path used by both verify and the webhook (idempotent). */
  private async markPaymentSuccess(payment: IPayment, cfPaymentId?: string): Promise<IPayment | null> {
    if (payment.status === PaymentStatus.SUCCESS) return payment;
    const updated = await paymentRepo.update(payment._id, {
      status: PaymentStatus.SUCCESS,
      cfPaymentId,
      capturedAt: new Date(),
    });

    await txRepo.create({
      transactionNumber: await nextNumber('TXN'),
      paymentId: payment._id,
      orderId: payment.orderId,
      customerId: payment.customerId,
      type: 'capture',
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      status: PaymentStatus.SUCCESS,
      gateway: payment.gateway,
      gatewayTransactionId: cfPaymentId,
      description: `Cashfree payment captured`,
    });

    await orderService.updatePaymentStatus(payment.orderId.toString(), PaymentStatus.SUCCESS);

    eventBus.publish(Events.PAYMENT_SUCCESS, {
      orderId: payment.orderId.toString(),
      paymentId: payment.id,
      userId: payment.customerId.toString(),
      amount: payment.amount,
    });

    return updated;
  }

  async refund(actorId: string, opts: { paymentId: string; amount?: number; reason: string }) {
    const payment = await paymentRepo.findById(opts.paymentId);
    if (!payment) throw new NotFoundError('Payment');
    if (payment.status !== PaymentStatus.SUCCESS) throw new BadRequestError('Only successful payments can be refunded');

    const refundAmount = opts.amount ?? payment.amount;
    if (refundAmount > payment.amount - payment.refundedAmount) {
      throw new BadRequestError('Refund amount exceeds refundable balance');
    }

    let cfRefundId: string | undefined;
    let razorpayRefundId: string | undefined;
    if (payment.gateway === 'cashfree' && payment.cfOrderId) {
      try {
        const refund = await cashfreeGateway.refund(payment.cfOrderId, {
          amount: refundAmount, // rupees
          refundId: await nextNumber('RFND'),
          note: opts.reason,
        });
        cfRefundId = refund.cf_refund_id;
      } catch (err) {
        logger.error('[payment] cashfree refund failed', err);
        throw new BadRequestError('Cashfree refund failed');
      }
    } else if (payment.gateway === 'razorpay' && payment.razorpayPaymentId) {
      // Legacy: orders paid via Razorpay before the Cashfree migration.
      try {
        const refund = await razorpayGateway.refund(payment.razorpayPaymentId, {
          amount: Math.round(refundAmount * 100),
          notes: { reason: opts.reason, actorId },
        });
        razorpayRefundId = refund.id;
      } catch (err) {
        logger.error('[payment] razorpay refund failed', err);
        throw new BadRequestError('Razorpay refund failed');
      }
    } else if (payment.gateway === 'wallet') {
      // BUG FIXED (found in the fixing/testing pass): a payment originally
      // made by debiting the customer's wallet has no gateway to call back —
      // this branch previously fell through to the bottom of the function,
      // which still marked the payment REFUNDED/PARTIALLY_REFUNDED and wrote
      // a success 'refund' transaction, even though the customer's wallet
      // was never actually credited back. The money was simply lost from
      // the system's perspective while the records claimed success.
      const { WalletService } = await import('../../wallet/services/wallet.service');
      const walletService = new WalletService();
      await walletService.credit({
        userId: payment.customerId.toString(),
        amount: refundAmount,
        source: 'order_refund',
        description: opts.reason,
        referenceType: 'payment',
        referenceId: payment.id,
      });
    }

    const newRefundedAmount = payment.refundedAmount + refundAmount;
    const newStatus = newRefundedAmount >= payment.amount ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED;

    const updated = await paymentRepo.update(payment._id, {
      status: newStatus,
      refundedAmount: newRefundedAmount,
      refundedAt: newRefundedAmount >= payment.amount ? new Date() : undefined,
      cfRefundId,
      razorpayRefundId,
    });

    await txRepo.create({
      transactionNumber: await nextNumber('TXN'),
      paymentId: payment._id,
      orderId: payment.orderId,
      customerId: payment.customerId,
      type: 'refund',
      amount: refundAmount,
      currency: payment.currency,
      method: payment.method,
      status: PaymentStatus.SUCCESS,
      gateway: payment.gateway,
      gatewayTransactionId: razorpayRefundId,
      description: opts.reason,
    });

    await orderService.updatePaymentStatus(payment.orderId.toString(), newStatus);

    eventBus.publish(Events.PAYMENT_REFUNDED, {
      orderId: payment.orderId.toString(),
      paymentId: payment.id,
      userId: payment.customerId.toString(),
      amount: refundAmount,
    });

    return updated;
  }

  /**
   * Cashfree webhook handler. `type` is Cashfree's webhook event type and
   * `payload.data` carries `{ order, payment }`. This is the server-side
   * backstop that reconciles a payment if the client never calls verify.
   */
  async handleWebhookEvent(type: string, payload: any): Promise<void> {
    logger.info(`[payment.webhook] received event: ${type}`);
    const data = payload?.data ?? {};
    const cfOrderId: string | undefined = data.order?.order_id;

    if (type === 'PAYMENT_SUCCESS_WEBHOOK') {
      if (!cfOrderId) return;
      const payment = await paymentRepo.findByCfOrderId(cfOrderId);
      if (!payment || payment.status === PaymentStatus.SUCCESS) return;
      await this.markPaymentSuccess(payment, data.payment?.cf_payment_id);
      return;
    }

    if (type === 'PAYMENT_FAILED_WEBHOOK' || type === 'PAYMENT_USER_DROPPED_WEBHOOK') {
      if (!cfOrderId) return;
      const payment = await paymentRepo.findByCfOrderId(cfOrderId);
      if (!payment || payment.status === PaymentStatus.SUCCESS) return;
      await paymentRepo.update(payment._id, {
        status: PaymentStatus.FAILED,
        failureReason: data.payment?.payment_message ?? 'Payment failed',
        gatewayResponse: data,
      });
      await orderService.updatePaymentStatus(payment.orderId.toString(), PaymentStatus.FAILED);
      eventBus.publish(Events.PAYMENT_FAILED, {
        orderId: payment.orderId.toString(),
        paymentId: payment.id,
        userId: payment.customerId.toString(),
        reason: data.payment?.payment_message,
      });
      return;
    }

    logger.warn(`[payment.webhook] unhandled event: ${type}`);
  }

  async listMine(customerId: string) {
    return txRepo.findByCustomer(customerId);
  }

  async listByOrder(orderId: string) {
    return paymentRepo.findByOrder(orderId);
  }

  async listAll(page = 1, limit = 20) {
    return paymentRepo.paginate({}, page, limit);
  }

  async stats() {
    return paymentRepo.statsForAdmin();
  }
}

export const paymentService = new PaymentService();
