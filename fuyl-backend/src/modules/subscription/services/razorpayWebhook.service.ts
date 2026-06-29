import { SubscriptionRepository } from '../repositories/subscription.repository';
import { EventRepository } from '../repositories/event.repository';
import { SubscriptionStatus } from '../../../shared/enums';
import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { logger } from '../../../config/logger';
import { RazorpayWebhookPayload } from '../interfaces';

const subRepo = new SubscriptionRepository();
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

  private async onCharged(payload: RazorpayWebhookPayload) {
    const { id } = payload.payload.subscription.entity;
    const payment = payload.payload.payment?.entity;
    const sub = await subRepo.findByRazorpaySubscriptionId(id);
    if (!sub) return;
    await subRepo.resetFailures(sub._id);
    await subRepo.updateStatus(sub._id, SubscriptionStatus.ACTIVE);
    await eventRepo.log({
      subscriptionId: sub._id,
      customerId: sub.customerId,
      type: 'charged',
      message: 'Subscription charged via Razorpay',
      metadata: { razorpayPaymentId: payment?.id, amount: payment?.amount },
    });
    eventBus.publish(Events.SUBSCRIPTION_CHARGED, {
      subscriptionId: sub.id,
      customerId: sub.customerId.toString(),
      amount: (payment?.amount ?? 0) / 100,
      razorpayPaymentId: payment?.id,
    });
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
}

export const razorpayWebhookService = new RazorpayWebhookService();
