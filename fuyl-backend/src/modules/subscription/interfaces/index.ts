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

export interface RazorpayWebhookPayload {
  event: string;
  payload: {
    subscription: {
      entity: {
        id: string;
        status: string;
        customer_id: string;
        plan_id: string;
        current_start: number;
        current_end: number;
        charge_at: number;
        notes?: Record<string, string>;
      };
    };
    payment?: {
      entity: { id: string; status: string; amount: number; method: string };
    };
    invoice?: {
      entity: { id: string; status: string; order_id?: string; payment_id?: string };
    };
  };
}
