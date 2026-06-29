import { SubscriptionInterval } from '../../../shared/enums';
import { addDays, addMonths } from '../../../shared/utils';

/**
 * Calculate the next delivery date based on the interval and interval count.
 */
export function calcNextDeliveryDate(
  from: Date,
  interval: typeof SubscriptionInterval[keyof typeof SubscriptionInterval],
  intervalCount = 1
): Date {
  switch (interval) {
    case SubscriptionInterval.DAILY:
      return addDays(from, 1 * intervalCount);
    case SubscriptionInterval.WEEKLY:
      return addDays(from, 7 * intervalCount);
    case SubscriptionInterval.BIWEEKLY:
      return addDays(from, 14 * intervalCount);
    case SubscriptionInterval.MONTHLY:
      return addMonths(from, 1 * intervalCount);
    case SubscriptionInterval.QUARTERLY:
      return addMonths(from, 3 * intervalCount);
    case SubscriptionInterval.CUSTOM:
      return addDays(from, 30 * intervalCount); // default to 30 days
    default:
      return addMonths(from, 1 * intervalCount);
  }
}

export function calcCycleWindow(
  from: Date,
  interval: typeof SubscriptionInterval[keyof typeof SubscriptionInterval],
  intervalCount = 1
): { start: Date; end: Date } {
  const start = new Date(from);
  const end = calcNextDeliveryDate(from, interval, intervalCount);
  return { start, end };
}

/**
 * Apply subscribe-&-save + perks to compute the final price.
 */
export function applySubscriptionPricing(
  basePrice: number,
  discountPercent: number,
  quantity: number
): number {
  const discounted = basePrice * (1 - discountPercent / 100);
  return Math.round(discounted * quantity * 100) / 100;
}
