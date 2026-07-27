import crypto from 'crypto';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import { BadRequestError } from '../../../shared/errors';

/**
 * Cashfree PG Subscriptions REST wrapper — plans, subscriptions, mandate
 * management. Same base URL / auth / webhook-signature scheme as the one-time
 * payment gateway (see payment/utils/cashfree.ts).
 *
 * ⚠️ VERIFY: Cashfree's subscription request/response field names and webhook
 * event types vary by API version. The shapes below follow the PG next-gen
 * Subscriptions API — confirm against your account's API version and test in
 * sandbox before enabling in production. The isolation of this file (mirroring
 * the old RazorpayService surface) means only this wrapper needs adjusting if
 * a field name differs.
 */

export type CfPlanIntervalType = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

export interface CfCreatePlanInput {
  planId: string;
  planName: string;
  amount: number;        // rupees — recurring amount per cycle
  maxCycles?: number;
  intervals: number;     // e.g. every N interval_type
  intervalType: CfPlanIntervalType;
  currency?: string;
}

export interface CfCreateSubscriptionInput {
  subscriptionId: string;
  planId: string;
  customer: { id: string; name?: string; email?: string; phone: string };
  firstChargeTime?: string; // ISO
  expiryTime?: string;      // ISO
  authAmount?: number;      // mandate authorization amount (rupees)
  returnUrl?: string;
  notes?: Record<string, string>;
}

export interface CfSubscription {
  subscription_id: string;
  subscription_status: string;      // INITIALIZED | BANK_APPROVAL_PENDING | ACTIVE | ...
  subscription_session_id?: string; // handed to the client SDK to authorize the mandate
  auth_link?: string;               // hosted authorization link (fallback to SDK)
  plan_details?: unknown;
}

class CashfreeSubscriptionService {
  private get baseUrl(): string {
    return env.cashfree.mode === 'production'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';
  }

  private get headers(): Record<string, string> {
    if (!env.cashfree.appId || !env.cashfree.secretKey) {
      throw new BadRequestError('Cashfree credentials not configured');
    }
    return {
      'Content-Type': 'application/json',
      'x-api-version': env.cashfree.apiVersion,
      'x-client-id': env.cashfree.appId,
      'x-client-secret': env.cashfree.secretKey,
    };
  }

  async createPlan(input: CfCreatePlanInput): Promise<{ plan_id: string }> {
    return this.request('/plans', 'POST', {
      plan_id: input.planId,
      plan_name: input.planName,
      plan_type: 'PERIODIC',
      plan_currency: input.currency ?? 'INR',
      plan_recurring_amount: Number(input.amount.toFixed(2)),
      plan_max_amount: Number(input.amount.toFixed(2)),
      plan_max_cycles: input.maxCycles,
      plan_intervals: input.intervals,
      plan_interval_type: input.intervalType,
    });
  }

  async createSubscription(input: CfCreateSubscriptionInput): Promise<CfSubscription> {
    return this.request('/subscriptions', 'POST', {
      subscription_id: input.subscriptionId,
      plan_details: { plan_id: input.planId },
      customer_details: {
        customer_id: input.customer.id,
        customer_name: input.customer.name,
        customer_email: input.customer.email,
        customer_phone: input.customer.phone,
      },
      authorization_details: input.authAmount
        ? { authorization_amount: Number(input.authAmount.toFixed(2)) }
        : undefined,
      subscription_meta: { return_url: input.returnUrl },
      subscription_first_charge_time: input.firstChargeTime,
      subscription_expiry_time: input.expiryTime,
      subscription_note: input.notes ? JSON.stringify(input.notes) : undefined,
    });
  }

  async getSubscription(subscriptionId: string): Promise<CfSubscription> {
    return this.request(`/subscriptions/${subscriptionId}`, 'GET');
  }

  private async manage(subscriptionId: string, action: 'CANCEL' | 'PAUSE' | 'ACTIVATE') {
    return this.request(`/subscriptions/${subscriptionId}/manage`, 'POST', {
      action_type: action,
    });
  }

  cancelSubscription(id: string) { return this.manage(id, 'CANCEL'); }
  pauseSubscription(id: string) { return this.manage(id, 'PAUSE'); }
  resumeSubscription(id: string) { return this.manage(id, 'ACTIVATE'); }

  /** Same base64(HMAC-SHA256(`${timestamp}${rawBody}`)) scheme as PG payments. */
  verifyWebhookSignature(timestamp: string, rawBody: string, signature: string): boolean {
    if (!env.cashfree.webhookSecret || !timestamp || !signature) return false;
    const expected = crypto
      .createHmac('sha256', env.cashfree.webhookSecret)
      .update(timestamp + rawBody)
      .digest('base64');
    if (expected.length !== signature.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  private async request(path: string, method: string, body?: unknown): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    try {
      const res = await fetch(url, {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!res.ok) {
        logger.error(`[cashfree.sub] ${method} ${path} failed`, json);
        throw new BadRequestError(`Cashfree subscription error: ${(json as any).message ?? 'unknown'}`);
      }
      return json;
    } catch (err) {
      logger.error(`[cashfree.sub] request failed ${method} ${path}`, err);
      throw err;
    }
  }
}

export const cashfreeSubscriptionService = new CashfreeSubscriptionService();
