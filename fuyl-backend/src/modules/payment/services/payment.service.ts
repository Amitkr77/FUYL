import { PaymentRepository, TransactionRepository } from '../repositories/payment.repository';
import { razorpayGateway } from '../utils/razorpay';
import { OrderService } from '../../order/services/order.service';
import {
  NotFoundError,
  BadRequestError,
  ConflictError,
} from '../../../shared/errors';
import { PaymentStatus, PaymentMethod } from '../../../shared/enums';
import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { logger } from '../../../config/logger';
import { nextNumber } from '../../order/utils/counter';
import mongoose, { Types } from 'mongoose';

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
    const amountInPaise = Math.round(order.grandTotal * 100);

    if (method === PaymentMethod.COD) {
      // COD: no Razorpay order, mark as pending until delivery
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

    // Razorpay flow
    const rzpOrder = await razorpayGateway.createOrder({
      amount: amountInPaise,
      currency: order.currency,
      receipt: order.orderNumber,
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
      gateway: 'razorpay',
      razorpayOrderId: rzpOrder.id,
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
      gateway: 'razorpay',
      gatewayTransactionId: rzpOrder.id,
      description: `Razorpay order created for ${order.orderNumber}`,
    });

    return {
      payment,
      razorpay: {
        orderId: rzpOrder.id,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    };
  }

  /**
   * Step 2: Verify the Razorpay payment signature after customer pays on the client.
   */
  async verifyPayment(customerId: string, opts: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) {
    const payment = await paymentRepo.findByRazorpayOrderId(opts.razorpayOrderId);
    if (!payment) throw new NotFoundError('Payment for Razorpay order');
    if (payment.customerId.toString() !== customerId) throw new BadRequestError('Not your payment');

    const valid = razorpayGateway.verifyPaymentSignature({
      orderId: opts.razorpayOrderId,
      paymentId: opts.razorpayPaymentId,
      signature: opts.razorpaySignature,
    });
    if (!valid) throw new BadRequestError('Invalid payment signature');

    const updated = await paymentRepo.update(payment._id, {
      status: PaymentStatus.SUCCESS,
      razorpayPaymentId: opts.razorpayPaymentId,
      razorpaySignature: opts.razorpaySignature,
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
      gateway: 'razorpay',
      gatewayTransactionId: opts.razorpayPaymentId,
      description: `Razorpay payment captured`,
    });

    await orderService.updatePaymentStatus(payment.orderId.toString(), PaymentStatus.SUCCESS);

    eventBus.publish(Events.PAYMENT_SUCCESS, {
      orderId: payment.orderId.toString(),
      paymentId: payment.id,
      userId: customerId,
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

    let razorpayRefundId: string | undefined;
    if (payment.gateway === 'razorpay' && payment.razorpayPaymentId) {
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
   * Razorpay webhook handler — called by the subscription webhook controller for payment events
   * that aren't subscription-specific (e.g. one-time order payments).
   */
  async handleWebhookEvent(event: string, payload: any): Promise<void> {
    logger.info(`[payment.webhook] received event: ${event}`);

    if (event === 'payment.captured' || event === 'payment.authorized') {
      const paymentEntity = payload.payload?.payment?.entity;
      if (!paymentEntity) return;
      const payment = await paymentRepo.findByRazorpayPaymentId(paymentEntity.id);
      if (!payment) return;
      if (payment.status === PaymentStatus.SUCCESS) return;
      await paymentRepo.update(payment._id, {
        status: PaymentStatus.SUCCESS,
        razorpayPaymentId: paymentEntity.id,
        capturedAt: new Date(),
        gatewayResponse: paymentEntity,
      });
      await orderService.updatePaymentStatus(payment.orderId.toString(), PaymentStatus.SUCCESS);
      eventBus.publish(Events.PAYMENT_SUCCESS, {
        orderId: payment.orderId.toString(),
        paymentId: payment.id,
        userId: payment.customerId.toString(),
        amount: payment.amount,
      });
      return;
    }

    if (event === 'payment.failed') {
      const paymentEntity = payload.payload?.payment?.entity;
      if (!paymentEntity) return;
      const payment = await paymentRepo.findByRazorpayOrderId(paymentEntity.order_id);
      if (!payment) return;
      await paymentRepo.update(payment._id, {
        status: PaymentStatus.FAILED,
        failureReason: paymentEntity.error_description ?? 'Payment failed',
      });
      await orderService.updatePaymentStatus(payment.orderId.toString(), PaymentStatus.FAILED);
      eventBus.publish(Events.PAYMENT_FAILED, {
        orderId: payment.orderId.toString(),
        paymentId: payment.id,
        userId: payment.customerId.toString(),
        reason: paymentEntity.error_description,
      });
      return;
    }

    logger.warn(`[payment.webhook] unhandled event: ${event}`);
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
