import { SubscriptionStatus, SubscriptionInterval, PaymentMethod } from '../../../shared/enums';

export interface CreateSubscriptionInput {
  productId: string;
  variantId?: string;
  planId: string;
  quantity?: number;
  paymentMethod: typeof PaymentMethod[keyof typeof PaymentMethod];
  addressId?: string;
}

export interface CreatePlanInput {
  name: string;
  description?: string;
  interval: typeof SubscriptionInterval[keyof typeof SubscriptionInterval];
  intervalCount?: number;
  discountPercent?: number;
  freeShipping?: boolean;
  priceLock?: boolean;
  maxSkipCount?: number;
  isActive?: boolean;
}

export type UpdatePlanInput = Partial<CreatePlanInput>;

export interface UpdateFrequencyInput {
  interval: typeof SubscriptionInterval[keyof typeof SubscriptionInterval];
  intervalCount: number;
}

export interface CancelSubscriptionInput {
  cancelAtCycle?: boolean;
  reason?: string;
}

export type UpdateFrequencyDTO = UpdateFrequencyInput;
export type CancelSubscriptionDTO = CancelSubscriptionInput;

export interface SubscriptionQuery {
  status?: typeof SubscriptionStatus[keyof typeof SubscriptionStatus];
  page?: number;
  limit?: number;
}

export interface BillingCycleResult {
  subscriptionId: string;
  success: boolean;
  orderId?: string;
  deliveryId?: string;
  failureReason?: string;
}

/**
 * Cashfree subscription webhook. Field locations vary by API version, so the
 * handler extracts defensively — VERIFY the exact shape against your account's
 * webhook payloads in sandbox.
 */
export interface CashfreeSubscriptionWebhookPayload {
  type: string;
  data?: {
    subscription_details?: {
      subscription_id?: string;
      subscription_status?: string;
      next_scheduled_time?: string;
      current_cycle?: number;
    };
    subscription_payment_details?: {
      cf_payment_id?: string;
      payment_amount?: number;
      payment_status?: string;
      next_scheduled_time?: string;
      cycle?: number;
    };
    cf_subscription_id?: string;
    subscription_id?: string;
  };
}
