import mongoose from 'mongoose';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { DeliveryRepository } from '../repositories/delivery.repository';
import { EventRepository } from '../repositories/event.repository';
import { ISubscription } from '../models/subscription.model';
import { SubscriptionStatus } from '../../../shared/enums';
import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { queueService } from '../../../shared/services/queue.service';
import { calcNextDeliveryDate, calcCycleWindow } from '../utils/billingCycle';
import { logger } from '../../../config/logger';
import { BadRequestError } from '../../../shared/errors';
import { CashfreeSubscriptionWebhookPayload } from '../interfaces';

const subRepo = new SubscriptionRepository();
const deliveryRepo = new DeliveryRepository();
const eventRepo = new EventRepository();

/**
 * Handles Cashfree subscription webhooks. Signature is verified by the webhook
 * controller (base64 HMAC scheme). This translates Cashfree events into our
 * subscription lifecycle — mirroring the previous Razorpay state machine.
 *
 * ⚠️ VERIFY event names / payload paths against your Cashfree API version.
 */
export class CashfreeSubscriptionWebhookService {
  async handle(type: string, payload: CashfreeSubscriptionWebhookPayload): Promise<void> {
    logger.info(`[cashfree.sub.webhook] received event: ${type}`);
    const subId = this.extractSubscriptionId(payload);
    if (!subId) {
      logger.warn('[cashfree.sub.webhook] no subscription id in payload');
      return;
    }
    const sub = await subRepo.findByCfSubscriptionId(subId);
    if (!sub) return;

    switch (type) {
      case 'SUBSCRIPTION_STATUS_CHANGE':
        await this.onStatusChange(sub, payload);
        return;
      case 'SUBSCRIPTION_NEW_PAYMENT':
      case 'SUBSCRIPTION_PAYMENT_SUCCESS':
        await this.onCharged(sub, payload);
        return;
      case 'SUBSCRIPTION_PAYMENT_DECLINED':
      case 'SUBSCRIPTION_PAYMENT_FAILED':
        await this.onPaymentFailed(sub);
        return;
      default:
        logger.warn(`[cashfree.sub.webhook] unhandled event: ${type}`);
    }
  }

  private extractSubscriptionId(p: CashfreeSubscriptionWebhookPayload): string | undefined {
    return (
      p.data?.subscription_details?.subscription_id ??
      p.data?.subscription_id ??
      p.data?.cf_subscription_id
    );
  }

  private async onStatusChange(sub: ISubscription, payload: CashfreeSubscriptionWebhookPayload) {
    const status = payload.data?.subscription_details?.subscription_status?.toUpperCase();
    const nextTime = payload.data?.subscription_details?.next_scheduled_time;

    switch (status) {
      case 'ACTIVE': {
        const next = nextTime ? new Date(nextTime) : sub.nextDeliveryDate;
        const window = calcCycleWindow(new Date(), sub.interval, sub.intervalCount);
        await subRepo.update(sub._id, {
          status: SubscriptionStatus.ACTIVE,
          nextDeliveryDate: next,
          currentCycleStart: window.start,
          currentCycleEnd: window.end,
        });
        await eventRepo.log({
          subscriptionId: sub._id, customerId: sub.customerId, type: 'activated',
          message: 'Subscription mandate authorized / active (Cashfree)',
          metadata: { cfSubscriptionId: sub.cfSubscriptionId },
        });
        eventBus.publish(Events.SUBSCRIPTION_ACTIVATED, {
          subscriptionId: sub.id, customerId: sub.customerId.toString(),
        });
        return;
      }
      case 'PAUSED':
      case 'ON_HOLD':
        await subRepo.updateStatus(sub._id, SubscriptionStatus.PAUSED);
        eventBus.publish(Events.SUBSCRIPTION_PAUSED, {
          subscriptionId: sub.id, customerId: sub.customerId.toString(),
        });
        return;
      case 'CANCELLED':
      case 'COMPLETED':
        await subRepo.updateStatus(sub._id, SubscriptionStatus.CANCELLED, {
          cancelledAt: new Date(),
          cancelledReason: `Cashfree subscription ${status.toLowerCase()}`,
        });
        eventBus.publish(Events.SUBSCRIPTION_CANCELLED, {
          subscriptionId: sub.id, customerId: sub.customerId.toString(),
        });
        return;
      default:
        logger.info(`[cashfree.sub.webhook] status ${status} — no local change`);
    }
  }

  /**
   * The one point where money is confirmed moved — create the subscription
   * order only after Cashfree confirms the cycle charge succeeded. Mirrors the
   * former Razorpay onCharged (see git history for the before/after).
   */
  private async onCharged(sub: ISubscription, payload: CashfreeSubscriptionWebhookPayload) {
    const pay = payload.data?.subscription_payment_details;
    const cfPaymentId = pay?.cf_payment_id;
    const nextTime = pay?.next_scheduled_time ?? payload.data?.subscription_details?.next_scheduled_time;

    await subRepo.resetFailures(sub._id);

    const cycleNumber = await deliveryRepo.nextCycleNumber(sub._id);
    const delivery = await deliveryRepo.create({
      subscriptionId: sub._id,
      customerId: sub.customerId,
      cycleNumber,
      scheduledFor: sub.nextDeliveryDate,
      executedAt: new Date(),
      amount: sub.finalPrice,
      currency: sub.currency,
      status: 'processing',
    });

    try {
      const shippingAddress = await this.resolveShippingAddress(sub);
      const { orderService } = await import('../../order/services/order.service');
      const order = await orderService.createFromSubscription({
        subscriptionId: sub._id.toString(),
        customerId: sub.customerId.toString(),
        productId: sub.productId.toString(),
        variantId: sub.variantId?.toString(),
        quantity: sub.quantity,
        unitPrice: sub.basePrice,
        discountPercent: sub.discountPercent,
        shippingAddress,
        cycleNumber,
        paymentMethod: sub.paymentMethod,
        cfPaymentId,
      });

      await deliveryRepo.markStatus(delivery.id, 'success', {
        orderId: new mongoose.Types.ObjectId(order.id),
        cfPaymentId,
      });

      const next = nextTime ? new Date(nextTime) : calcNextDeliveryDate(new Date(), sub.interval, sub.intervalCount);
      const window = calcCycleWindow(new Date(), sub.interval, sub.intervalCount);
      await subRepo.update(sub._id, {
        status: SubscriptionStatus.ACTIVE,
        nextDeliveryDate: next,
        currentCycleStart: window.start,
        currentCycleEnd: window.end,
      });
      await subRepo.incrementCycle(sub._id);

      await eventRepo.log({
        subscriptionId: sub._id, customerId: sub.customerId, type: 'charged',
        message: `Cycle ${cycleNumber} charged; order ${order.orderNumber} created`,
        metadata: { cfPaymentId, amount: pay?.payment_amount, orderId: order.id },
      });

      eventBus.publish(Events.SUBSCRIPTION_CHARGED, {
        subscriptionId: sub.id,
        customerId: sub.customerId.toString(),
        amount: pay?.payment_amount ?? sub.finalPrice,
        cfPaymentId,
        orderId: order.id,
        cycleNumber,
        nextDeliveryDate: next.toISOString(),
      });

      queueService.subscriptionReminder({
        subscriptionId: sub.id,
        customerId: sub.customerId.toString(),
        cycleNumber,
      });
    } catch (err) {
      // Customer WAS charged — fulfilment failure, not a payment failure. Don't
      // advance the cycle or mark PAST_DUE; surface loudly for manual handling.
      logger.error(`[cashfree.sub.webhook] order creation failed after successful charge — subscription ${sub.id}, payment ${cfPaymentId}`, err);
      await deliveryRepo.markStatus(delivery.id, 'failed', {
        failureReason: err instanceof Error ? err.message : 'Order creation failed after a confirmed payment',
        cfPaymentId,
      });
      await eventRepo.log({
        subscriptionId: sub._id, customerId: sub.customerId, type: 'charge_fulfilment_error',
        message: 'Payment succeeded but order creation failed — needs manual reconciliation',
        metadata: { cfPaymentId, error: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  private async onPaymentFailed(sub: ISubscription) {
    await subRepo.incrementFailure(sub._id);
    const updated = await subRepo.findById(sub._id);
    if (updated && updated.consecutiveFailures >= 3) {
      await subRepo.updateStatus(sub._id, SubscriptionStatus.PAST_DUE);
    }
    await eventRepo.log({
      subscriptionId: sub._id, customerId: sub.customerId, type: 'failed',
      message: 'Subscription payment failed (Cashfree)',
      metadata: { cfSubscriptionId: sub.cfSubscriptionId },
    });
    eventBus.publish(Events.SUBSCRIPTION_FAILED, {
      subscriptionId: sub.id, customerId: sub.customerId.toString(),
      reason: 'Cashfree subscription payment failed',
    });
  }

  /** Resolve the customer's real shipping address for a subscription order. */
  private async resolveShippingAddress(sub: ISubscription) {
    const { customerService } = await import('../../customer/services/customer.service');
    const profile = await customerService.getOrCreateProfile(sub.customerId.toString());

    const snapshot = sub.addressSnapshotId
      ? profile.addresses.find((a: any) => a._id?.toString() === sub.addressSnapshotId?.toString())
      : undefined;
    const address = snapshot
      ?? profile.addresses.find((a: any) => a.isDefault)
      ?? profile.addresses[0];

    if (!address) {
      throw new BadRequestError(
        `No shipping address on file for customer ${sub.customerId} — cannot fulfil subscription ${sub.id}`
      );
    }

    return {
      fullName: profile.displayName || 'Customer',
      phone: address.phone ?? '',
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      pincode: address.postalCode,
      country: address.country ?? 'IN',
      type: 'home' as const,
    };
  }
}

export const cashfreeSubscriptionWebhookService = new CashfreeSubscriptionWebhookService();
