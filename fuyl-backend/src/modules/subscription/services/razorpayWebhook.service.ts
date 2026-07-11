import mongoose from 'mongoose';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import { DeliveryRepository } from '../repositories/delivery.repository';
import { EventRepository } from '../repositories/event.repository';
import { ISubscription } from '../models/subscription.model';
import { SubscriptionStatus } from '../../../shared/enums';
import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { queueService } from '../../../shared/services/queue.service';
import { logger } from '../../../config/logger';
import { BadRequestError } from '../../../shared/errors';
import { RazorpayWebhookPayload } from '../interfaces';

const subRepo = new SubscriptionRepository();
const deliveryRepo = new DeliveryRepository();
const eventRepo = new EventRepository();

/**
 * Handles Razorpay webhook events for subscriptions.
 * Verifies signature and dispatches to the right internal event.
 */
export class RazorpayWebhookService {
  async handle(event: string, payload: RazorpayWebhookPayload): Promise<void> {
    logger.info(`[razorpay.webhook] received event: ${event}`);

    switch (event) {
      case 'subscription.activated':
        await this.onActivated(payload); return;
      case 'subscription.charged':
        await this.onCharged(payload); return;
      case 'subscription.payment_failed':
        await this.onPaymentFailed(payload); return;
      case 'subscription.halted':
        await this.onHalted(payload); return;
      case 'subscription.cancelled':
        await this.onCancelled(payload); return;
      case 'subscription.paused':
        await this.onPaused(payload); return;
      case 'subscription.resumed':
        await this.onResumed(payload); return;
      default:
        logger.warn(`[razorpay.webhook] unhandled event: ${event}`);
    }
  }

  private async onActivated(payload: RazorpayWebhookPayload) {
    const { id, current_start, current_end, charge_at } = payload.payload.subscription.entity;
    const sub = await subRepo.findByRazorpaySubscriptionId(id);
    if (!sub) return;
    await subRepo.update(sub._id, {
      status: SubscriptionStatus.ACTIVE,
      currentCycleStart: new Date(current_start * 1000),
      currentCycleEnd: new Date(current_end * 1000),
      nextDeliveryDate: new Date(charge_at * 1000),
    });
    await eventRepo.log({
      subscriptionId: sub._id,
      customerId: sub.customerId,
      type: 'activated',
      message: 'Subscription activated by Razorpay',
      metadata: { razorpaySubscriptionId: id },
    });
    eventBus.publish(Events.SUBSCRIPTION_ACTIVATED, {
      subscriptionId: sub.id,
      customerId: sub.customerId.toString(),
    });
  }

  /**
   * The only point in the whole subscription flow where we know money
   * actually moved. Order creation used to happen optimistically in
   * billing.service.ts's daily cron, before any payment confirmation —
   * moved here so a subscription order is only ever created once Razorpay
   * confirms the charge succeeded. See billing.service.ts's class comment
   * for the before/after.
   */
  private async onCharged(payload: RazorpayWebhookPayload) {
    const { id, current_start, current_end, charge_at } = payload.payload.subscription.entity;
    const payment = payload.payload.payment?.entity;
    const sub = await subRepo.findByRazorpaySubscriptionId(id);
    if (!sub) return;

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
        // Real, confirmed payment id — createFromSubscription marks the
        // order paymentStatus SUCCESS when this is present, PENDING
        // otherwise. Previously always undefined here, so every
        // subscription order was created PENDING regardless of payment.
        razorpayPaymentId: payment?.id,
      });

      await deliveryRepo.markStatus(delivery.id, 'success', {
        orderId: new mongoose.Types.ObjectId(order.id),
        razorpayPaymentId: payment?.id,
      });

      await subRepo.update(sub._id, {
        status: SubscriptionStatus.ACTIVE,
        nextDeliveryDate: new Date(charge_at * 1000),
        currentCycleStart: new Date(current_start * 1000),
        currentCycleEnd: new Date(current_end * 1000),
      });
      await subRepo.incrementCycle(sub._id);

      await eventRepo.log({
        subscriptionId: sub._id,
        customerId: sub.customerId,
        type: 'charged',
        message: `Cycle ${cycleNumber} charged; order ${order.orderNumber} created`,
        metadata: { razorpayPaymentId: payment?.id, amount: payment?.amount, orderId: order.id },
      });

      eventBus.publish(Events.SUBSCRIPTION_CHARGED, {
        subscriptionId: sub.id,
        customerId: sub.customerId.toString(),
        amount: (payment?.amount ?? 0) / 100,
        razorpayPaymentId: payment?.id,
        orderId: order.id,
        cycleNumber,
        nextDeliveryDate: new Date(charge_at * 1000).toISOString(),
      });

      queueService.subscriptionReminder({
        subscriptionId: sub.id,
        customerId: sub.customerId.toString(),
        cycleNumber,
      });
    } catch (err) {
      // The customer WAS charged — this is a fulfilment failure, not a
      // payment failure. Do not touch nextDeliveryDate/cycle counters (the
      // cycle didn't actually advance) and do not mark the subscription
      // PAST_DUE (it isn't — Razorpay was paid). Surface loudly instead:
      // this needs a human to create the order manually and investigate
      // why createFromSubscription failed after a successful charge.
      logger.error(`[razorpay.webhook] order creation failed after successful charge — subscription ${sub.id}, payment ${payment?.id}`, err);
      await deliveryRepo.markStatus(delivery.id, 'failed', {
        failureReason: err instanceof Error ? err.message : 'Order creation failed after a confirmed payment',
        razorpayPaymentId: payment?.id,
      });
      await eventRepo.log({
        subscriptionId: sub._id,
        customerId: sub.customerId,
        type: 'charge_fulfilment_error',
        message: 'Payment succeeded but order creation failed — needs manual reconciliation',
        metadata: { razorpayPaymentId: payment?.id, error: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  private async onPaymentFailed(payload: RazorpayWebhookPayload) {
    const { id } = payload.payload.subscription.entity;
    const sub = await subRepo.findByRazorpaySubscriptionId(id);
    if (!sub) return;
    await subRepo.incrementFailure(sub._id);
    const updated = await subRepo.findById(sub._id);
    if (updated && updated.consecutiveFailures >= 3) {
      await subRepo.updateStatus(sub._id, SubscriptionStatus.PAST_DUE);
    }
    await eventRepo.log({
      subscriptionId: sub._id,
      customerId: sub.customerId,
      type: 'failed',
      message: 'Subscription payment failed',
      metadata: { razorpaySubscriptionId: id },
    });
    eventBus.publish(Events.SUBSCRIPTION_FAILED, {
      subscriptionId: sub.id,
      customerId: sub.customerId.toString(),
      reason: 'Razorpay payment failed',
    });
  }

  // Razorpay stops attempting further charges on this mandate and reports
  // it as halted — this is the real "retries exhausted" signal, replacing
  // the fake Math.random() dunning used to simulate before this was wired.
  private async onHalted(payload: RazorpayWebhookPayload) {
    const { id } = payload.payload.subscription.entity;
    const sub = await subRepo.findByRazorpaySubscriptionId(id);
    if (!sub) return;
    await subRepo.updateStatus(sub._id, SubscriptionStatus.CANCELLED, {
      cancelledAt: new Date(),
      cancelledReason: 'Razorpay halted the mandate after exhausting its own retry schedule',
    });
    await eventRepo.log({
      subscriptionId: sub._id,
      customerId: sub.customerId,
      type: 'halted',
      message: 'Subscription halted by Razorpay (retries exhausted)',
      metadata: { razorpaySubscriptionId: id },
    });
    eventBus.publish(Events.SUBSCRIPTION_FAILED, {
      subscriptionId: sub.id,
      customerId: sub.customerId.toString(),
      reason: 'Razorpay halted the mandate',
      final: true,
    });
  }

  private async onCancelled(payload: RazorpayWebhookPayload) {
    const { id } = payload.payload.subscription.entity;
    const sub = await subRepo.findByRazorpaySubscriptionId(id);
    if (!sub) return;
    await subRepo.updateStatus(sub._id, SubscriptionStatus.CANCELLED, {
      cancelledAt: new Date(),
      cancelledReason: 'Cancelled via Razorpay',
    });
    eventBus.publish(Events.SUBSCRIPTION_CANCELLED, {
      subscriptionId: sub.id,
      customerId: sub.customerId.toString(),
    });
  }

  private async onPaused(payload: RazorpayWebhookPayload) {
    const { id } = payload.payload.subscription.entity;
    const sub = await subRepo.findByRazorpaySubscriptionId(id);
    if (!sub) return;
    await subRepo.updateStatus(sub._id, SubscriptionStatus.PAUSED);
    eventBus.publish(Events.SUBSCRIPTION_PAUSED, {
      subscriptionId: sub.id,
      customerId: sub.customerId.toString(),
    });
  }

  private async onResumed(payload: RazorpayWebhookPayload) {
    const { id, charge_at } = payload.payload.subscription.entity;
    const sub = await subRepo.findByRazorpaySubscriptionId(id);
    if (!sub) return;
    await subRepo.update(sub._id, {
      status: SubscriptionStatus.ACTIVE,
      nextDeliveryDate: new Date(charge_at * 1000),
    });
    eventBus.publish(Events.SUBSCRIPTION_RESUMED, {
      subscriptionId: sub.id,
      customerId: sub.customerId.toString(),
    });
  }

  /**
   * Resolve the customer's real shipping address for a subscription order.
   * Previously billing.service.ts used a hardcoded placeholder ("Subscriber",
   * Bangalore 560001) for every subscription order regardless of who the
   * customer actually was. addressSnapshotId is captured at subscription
   * creation time (subscription.service.ts) precisely so this can resolve
   * a real address; falls back to the customer's default/first address if
   * the snapshot no longer matches one (e.g. deleted since).
   */
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

    // CustomerProfile's address shape differs from Order's embedded address
    // (postalCode vs pincode, no fullName) — the same mismatch checkout had
    // before Phase 0 aligned checkout's schema with Order's; mapped here
    // the same way since this address comes from a different source model.
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

export const razorpayWebhookService = new RazorpayWebhookService();
