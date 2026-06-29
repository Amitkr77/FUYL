import { SubscriptionRepository } from '../repositories/subscription.repository';
import { DeliveryRepository } from '../repositories/delivery.repository';
import { EventRepository } from '../repositories/event.repository';
import { PlanRepository } from '../repositories/plan.repository';
import { CreateSubscriptionInput, CancelSubscriptionDTO, UpdateFrequencyDTO } from '../interfaces';
import { SubscriptionStatus, SubscriptionInterval } from '../../../shared/enums';
import { NotFoundError, ConflictError, BadRequestError } from '../../../shared/errors';
import { calcNextDeliveryDate, calcCycleWindow, applySubscriptionPricing } from '../utils/billingCycle';
import { razorpayService } from '../utils/razorpay.service';
import { eventBus, Events } from '../../../shared/services/eventBus.service';
import { logger } from '../../../config/logger';
import mongoose from 'mongoose';

const subRepo = new SubscriptionRepository();
const deliveryRepo = new DeliveryRepository();
const eventRepo = new EventRepository();
const planRepo = new PlanRepository();

export class SubscriptionService {
  async create(customerId: string, input: CreateSubscriptionInput) {
    const plan = await planRepo.findById(input.planId);
    if (!plan) throw new NotFoundError('Subscription plan');
    if (!plan.isActive) throw new BadRequestError('Plan is not active');

    // Pricing — fetch base price from catalog/variant
    // For scaffolding we read from the input. In production this calls catalog.service.getPrice(productId, variantId)
    const basePrice = await this.fetchBasePrice(input.productId, input.variantId);
    const quantity = input.quantity ?? 1;
    const finalPrice = applySubscriptionPricing(basePrice, plan.discountPercent, quantity);

    const now = new Date();
    const intervalCount = plan.intervalCount ?? 1;
    const nextDeliveryDate = calcNextDeliveryDate(now, plan.interval, intervalCount);
    const cycleWindow = calcCycleWindow(now, plan.interval, intervalCount);

    // Create Razorpay subscription (skip in COD mode)
    let razorpaySubId: string | undefined;
    let razorpayCustomerId: string | undefined;
    if (input.paymentMethod === 'razorpay') {
      try {
        // Note: a Razorpay plan needs to exist; in production we'd cache a map of our plan_id -> razorpay plan_id
        // Here we just attempt creation and tolerate failure for the scaffold.
        const rzpPlan = await razorpayService.createPlan({
          period: plan.interval === SubscriptionInterval.DAILY ? 'daily' :
                  plan.interval === SubscriptionInterval.WEEKLY || plan.interval === SubscriptionInterval.BIWEEKLY ? 'weekly' :
                  plan.interval === SubscriptionInterval.QUARTERLY ? 'monthly' : 'monthly',
          interval: intervalCount,
          item: {
            name: plan.name,
            amount: Math.round(finalPrice * 100),
            currency: 'INR',
            description: plan.description,
          },
          notes: { productId: input.productId, planId: plan.id },
        }).catch((err) => {
          logger.warn('[subscription] razorpay plan create failed, continuing in pending state', err);
          return null;
        });

        if (rzpPlan) {
          const rzpSub = await razorpayService.createSubscription({
            plan_id: rzpPlan.id,
            quantity,
            customer_notify: 1,
            total_count: 120, // ~10 years of monthly — sane ceiling
            notes: {
              customerId,
              productId: input.productId,
              planId: plan.id,
            },
          });
          razorpaySubId = rzpSub.id;
        }
      } catch (err) {
        logger.warn('[subscription] razorpay subscription create failed; creating in pending state', err);
      }
    }

    const subscription = await subRepo.create({
      customerId: new mongoose.Types.ObjectId(customerId),
      productId: new mongoose.Types.ObjectId(input.productId),
      variantId: input.variantId ? new mongoose.Types.ObjectId(input.variantId) : undefined,
      planId: plan._id,
      status: SubscriptionStatus.PENDING,
      interval: plan.interval,
      intervalCount,
      quantity,
      basePrice,
      discountPercent: plan.discountPercent,
      finalPrice,
      currency: 'INR',
      paymentMethod: input.paymentMethod,
      razorpaySubscriptionId: razorpaySubId,
      razorpayCustomerId,
      nextDeliveryDate,
      currentCycleStart: cycleWindow.start,
      currentCycleEnd: cycleWindow.end,
      freeShipping: plan.freeShipping,
      priceLock: plan.priceLock,
      addressSnapshotId: input.addressId ? new mongoose.Types.ObjectId(input.addressId) : undefined,
    });

    await eventRepo.log({
      subscriptionId: subscription._id,
      customerId: subscription.customerId,
      type: 'created',
      message: `Subscription created for plan "${plan.name}"`,
      metadata: { planId: plan.id, razorpaySubscriptionId: razorpaySubId },
    });

    eventBus.publish(Events.SUBSCRIPTION_CREATED, { subscriptionId: subscription.id, customerId });

    return subscription;
  }

  async listMine(customerId: string, status?: string) {
    const filter = status ? { status } : {};
    return subRepo.findByCustomer(customerId, filter);
  }

  async getById(id: string) {
    const sub = await subRepo.findById(id);
    if (!sub) throw new NotFoundError('Subscription');
    return sub;
  }

  async pause(id: string, customerId: string) {
    const sub = await this.getById(id);
    if (sub.status !== SubscriptionStatus.ACTIVE) {
      throw new ConflictError(`Cannot pause subscription in status ${sub.status}`);
    }
    if (sub.razorpaySubscriptionId) {
      try { await razorpayService.pauseSubscription(sub.razorpaySubscriptionId); }
      catch (err) { logger.warn('[subscription] razorpay pause failed', err); }
    }
    const updated = await subRepo.updateStatus(id, SubscriptionStatus.PAUSED);
    await eventRepo.log({
      subscriptionId: sub._id, customerId: sub.customerId, type: 'paused',
      message: 'Subscription paused', actor: new mongoose.Types.ObjectId(customerId),
    });
    eventBus.publish(Events.SUBSCRIPTION_PAUSED, { subscriptionId: id, customerId });
    return updated;
  }

  async resume(id: string, customerId: string) {
    const sub = await this.getById(id);
    if (sub.status !== SubscriptionStatus.PAUSED) {
      throw new ConflictError(`Cannot resume subscription in status ${sub.status}`);
    }
    if (sub.razorpaySubscriptionId) {
      try { await razorpayService.resumeSubscription(sub.razorpaySubscriptionId); }
      catch (err) { logger.warn('[subscription] razorpay resume failed', err); }
    }
    const next = calcNextDeliveryDate(new Date(), sub.interval, sub.intervalCount);
    const updated = await subRepo.update(id, {
      status: SubscriptionStatus.ACTIVE,
      nextDeliveryDate: next,
      currentCycleStart: new Date(),
      currentCycleEnd: next,
    });
    await eventRepo.log({
      subscriptionId: sub._id, customerId: sub.customerId, type: 'resumed',
      message: `Subscription resumed, next delivery ${next.toISOString()}`,
      actor: new mongoose.Types.ObjectId(customerId),
    });
    eventBus.publish(Events.SUBSCRIPTION_RESUMED, { subscriptionId: id, customerId });
    return updated;
  }

  async skipNext(id: string, customerId: string, cycleNumber?: number) {
    const sub = await this.getById(id);
    if (sub.status !== SubscriptionStatus.ACTIVE) {
      throw new ConflictError('Only active subscriptions can skip');
    }
    const next = calcNextDeliveryDate(sub.nextDeliveryDate, sub.interval, sub.intervalCount);
    const updated = await subRepo.update(id, {
      nextDeliveryDate: next,
      currentCycleStart: sub.currentCycleEnd,
      currentCycleEnd: next,
      $inc: { skipCount: 1 } as any,
    });
    // Also mark the scheduled delivery as skipped
    const delivery = await deliveryRepo.findScheduledForDate(sub.nextDeliveryDate)
      .then(ds => ds.find(d => d.subscriptionId.toString() === id));
    if (delivery) {
      await deliveryRepo.markStatus(delivery.id, 'skipped', { failureReason: 'Customer skipped' });
    }

    await eventRepo.log({
      subscriptionId: sub._id, customerId: sub.customerId, type: 'skipped',
      message: `Skipped cycle; next delivery ${next.toISOString()}`,
      actor: new mongoose.Types.ObjectId(customerId),
    });
    return updated;
  }

  async changeFrequency(id: string, customerId: string, dto: UpdateFrequencyDTO) {
    const sub = await this.getById(id);
    if (sub.status === SubscriptionStatus.CANCELLED || sub.status === SubscriptionStatus.EXPIRED) {
      throw new ConflictError('Cannot change frequency of cancelled/expired subscription');
    }
    const next = calcNextDeliveryDate(new Date(), dto.interval, dto.intervalCount);
    const updated = await subRepo.update(id, {
      interval: dto.interval,
      intervalCount: dto.intervalCount,
      nextDeliveryDate: next,
      currentCycleStart: new Date(),
      currentCycleEnd: next,
    });
    await eventRepo.log({
      subscriptionId: sub._id, customerId: sub.customerId, type: 'frequency_changed',
      message: `Frequency changed to ${dto.interval} × ${dto.intervalCount}`,
      actor: new mongoose.Types.ObjectId(customerId),
    });
    return updated;
  }

  async cancel(id: string, customerId: string, dto: CancelSubscriptionDTO) {
    const sub = await this.getById(id);
    if (sub.status === SubscriptionStatus.CANCELLED) {
      throw new ConflictError('Subscription already cancelled');
    }
    if (sub.razorpaySubscriptionId) {
      try { await razorpayService.cancelSubscription(sub.razorpaySubscriptionId, dto.cancelAtCycle); }
      catch (err) { logger.warn('[subscription] razorpay cancel failed', err); }
    }
    const updated = await subRepo.update(id, {
      status: SubscriptionStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledReason: dto.reason,
      cancelledBy: new mongoose.Types.ObjectId(customerId),
    });
    await eventRepo.log({
      subscriptionId: sub._id, customerId: sub.customerId, type: 'cancelled',
      message: dto.cancelAtCycle ? 'Cancelled at end of cycle' : 'Cancelled immediately',
      actor: new mongoose.Types.ObjectId(customerId),
      metadata: { reason: dto.reason },
    });
    eventBus.publish(Events.SUBSCRIPTION_CANCELLED, { subscriptionId: id, customerId });
    return updated;
  }

  async listDeliveries(id: string) {
    return deliveryRepo.findBySubscription(id);
  }

  async listEvents(id: string) {
    return eventRepo.findBySubscription(id);
  }

  /**
   * Fetch the base price for a product/variant.
   * Wires to the real catalog service.
   */
  private async fetchBasePrice(productId: string, variantId?: string): Promise<number> {
    const { catalogService } = await import('../../catalog/services/catalog.service');
    const { price } = await catalogService.getPrice(productId, variantId);
    return price;
  }
}

export const subscriptionService = new SubscriptionService();
