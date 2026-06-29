import { SubscriptionRepository } from '../repositories/subscription.repository';
import { DeliveryRepository } from '../repositories/delivery.repository';
import { EventRepository } from '../repositories/event.repository';
import { ISubscription } from '../models/subscription.model';
import { SubscriptionStatus } from '../../../shared/enums';
import { calcNextDeliveryDate } from '../utils/billingCycle';
import { razorpayService } from '../utils/razorpay.service';
import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { queueService } from '../../../shared/services/queue.service';
import { logger } from '../../../config/logger';
import mongoose from 'mongoose';

const subRepo = new SubscriptionRepository();
const deliveryRepo = new DeliveryRepository();
const eventRepo = new EventRepository();

/**
 * Billing cycle executor — runs daily via cron.
 * Picks due subscriptions, generates an order, charges via Razorpay, records delivery.
 */
export class BillingService {
  async runDaily(): Promise<{ processed: number; succeeded: number; failed: number }> {
    const now = new Date();
    const due = await subRepo.findDueForBilling(now);
    logger.info(`[billing] processing ${due.length} due subscriptions`);

    let succeeded = 0;
    let failed = 0;

    for (const sub of due) {
      try {
        await this.processSubscription(sub);
        succeeded++;
      } catch (err) {
        logger.error(`[billing] subscription ${sub.id} failed`, err);
        failed++;
      }
    }

    return { processed: due.length, succeeded, failed };
  }

  async processSubscription(sub: ISubscription): Promise<void> {
    const cycleNumber = await deliveryRepo.nextCycleNumber(sub._id);

    // Schedule a delivery record (status=processing)
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
      // Attempt Razorpay charge — for subscriptions Razorpay auto-charges via the webhook.
      // In a real flow we wait for `subscription.charged` webhook. For the scaffold we
      // assume success and create an "order" placeholder (real impl calls order.service).
      const orderId = await this.spawnOrder(sub, delivery);

      await deliveryRepo.markStatus(delivery.id, 'success', {
        orderId: new mongoose.Types.ObjectId(orderId),
      });

      await subRepo.update(sub._id, {
        nextDeliveryDate: calcNextDeliveryDate(sub.nextDeliveryDate, sub.interval, sub.intervalCount),
        currentCycleStart: sub.currentCycleEnd,
        currentCycleEnd: calcNextDeliveryDate(sub.nextDeliveryDate, sub.interval, sub.intervalCount),
      });
      await subRepo.resetFailures(sub._id);
      await subRepo.incrementCycle(sub._id);

      await eventRepo.log({
        subscriptionId: sub._id,
        customerId: sub.customerId,
        type: 'charged',
        message: `Cycle ${cycleNumber} charged successfully`,
        metadata: { orderId, deliveryId: delivery.id, amount: sub.finalPrice },
      });

      eventBus.publish(Events.SUBSCRIPTION_CHARGED, {
        subscriptionId: sub.id,
        customerId: sub.customerId.toString(),
        amount: sub.finalPrice,
        cycleNumber,
        orderId,
      });

      // Trigger cashback via wallet module (subscribed)
      // Trigger reminder via notification queue
      queueService.subscriptionReminder({
        subscriptionId: sub.id,
        customerId: sub.customerId.toString(),
        cycleNumber,
      });
    } catch (err) {
      await deliveryRepo.markStatus(delivery.id, 'failed', {
        failureReason: err instanceof Error ? err.message : 'Unknown error',
      });
      await subRepo.incrementFailure(sub._id);
      const updated = await subRepo.findById(sub._id);
      if (updated && updated.consecutiveFailures >= 3) {
        await subRepo.updateStatus(sub._id, SubscriptionStatus.PAST_DUE);
        eventBus.publish(Events.SUBSCRIPTION_FAILED, {
          subscriptionId: sub.id,
          customerId: sub.customerId.toString(),
          reason: 'Max retries exceeded',
        });
        queueService.subscriptionDunning({ subscriptionId: sub.id });
      }
      throw err;
    }
  }

  /**
   * Spawn a real order through the order module — wires to orderService.createFromSubscription().
   */
  private async spawnOrder(sub: any, _delivery: any): Promise<string> {
    const { orderService } = await import('../../order/services/order.service');
    // Resolve a shipping address. In production this comes from the customer's saved address.
    // For scaffold, use a minimal placeholder if no addressSnapshotId is set.
    const shippingAddress = {
      fullName: 'Subscriber',
      phone: '+910000000000',
      line1: 'Auto-generated from subscription',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      country: 'IN',
      type: 'home' as const,
    };

    const order = await orderService.createFromSubscription({
      subscriptionId: sub._id.toString(),
      customerId: sub.customerId.toString(),
      productId: sub.productId.toString(),
      variantId: sub.variantId?.toString(),
      quantity: sub.quantity,
      unitPrice: sub.basePrice,
      discountPercent: sub.discountPercent,
      shippingAddress,
      cycleNumber: await deliveryRepo.nextCycleNumber(sub._id) - 1, // we already incremented
      paymentMethod: sub.paymentMethod,
      razorpayPaymentId: undefined, // Razorpay subscription webhook will record this separately
    });

    return order.id;
  }
}

export const billingService = new BillingService();
