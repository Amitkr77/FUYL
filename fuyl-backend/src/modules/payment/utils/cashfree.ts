import crypto from 'crypto';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import { BadRequestError } from '../../../shared/errors';

/**
 * Cashfree Payments (PG) REST wrapper — one-time order payments, status
 * lookups, and refunds. Replaces the Razorpay gateway.
 *
 * Key differences from Razorpay handled here:
 *  - Amounts are in RUPEES (decimal), not paise.
 *  - There is no client-side signature to verify; after the shopper pays we
 *    confirm by fetching the order/payment status server-side.
 *  - Webhooks are signed as base64(HMAC-SHA256(`${timestamp}${rawBody}`)).
 */

export interface CashfreeCreateOrderInput {
  orderId: string;         // our unique id (used as Cashfree order_id)
  amount: number;          // RUPEES
  currency: string;
  customer: {
    id: string;
    phone: string;
    email?: string;
    name?: string;
  };
  returnUrl?: string;
  notifyUrl?: string;
  notes?: Record<string, string>;
}

export interface CashfreeOrder {
  cf_order_id: string;
  order_id: string;
  payment_session_id: string;
  order_status: string;    // ACTIVE | PAID | EXPIRED | TERMINATED | ...
  order_amount: number;
  order_currency: string;
}

export interface CashfreeOrderPayment {
  cf_payment_id: string;
  payment_status: string;  // SUCCESS | FAILED | PENDING | USER_DROPPED | ...
  payment_amount: number;
  payment_method?: unknown;
  payment_message?: string;
}

function timingSafeEqual(expected: string, provided: string): boolean {
  if (typeof provided !== 'string' || expected.length !== provided.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
}

class CashfreeGateway {
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

  async createOrder(input: CashfreeCreateOrderInput): Promise<CashfreeOrder> {
    return this.request('/orders', 'POST', {
      order_id: input.orderId,
      order_amount: Number(input.amount.toFixed(2)),
      order_currency: input.currency,
      customer_details: {
        customer_id: input.customer.id,
        customer_phone: input.customer.phone,
        customer_email: input.customer.email,
        customer_name: input.customer.name,
      },
      order_meta: {
        return_url: input.returnUrl,
        notify_url: input.notifyUrl,
      },
      order_note: input.notes ? JSON.stringify(input.notes) : undefined,
    });
  }

  async getOrder(orderId: string): Promise<CashfreeOrder> {
    return this.request(`/orders/${orderId}`, 'GET');
  }

  async getOrderPayments(orderId: string): Promise<CashfreeOrderPayment[]> {
    return this.request(`/orders/${orderId}/payments`, 'GET');
  }

  async refund(orderId: string, params: { amount: number; refundId: string; note?: string }): Promise<any> {
    return this.request(`/orders/${orderId}/refunds`, 'POST', {
      refund_amount: Number(params.amount.toFixed(2)),
      refund_id: params.refundId,
      refund_note: params.note,
    });
  }

  /**
   * Verify a Cashfree webhook. Signature = base64(HMAC-SHA256(timestamp + rawBody))
   * keyed by the account secret. Both the `x-webhook-timestamp` and
   * `x-webhook-signature` headers are required.
   */
  verifyWebhookSignature(timestamp: string, rawBody: string, signature: string): boolean {
    if (!env.cashfree.webhookSecret || !timestamp || !signature) return false;
    const expected = crypto
      .createHmac('sha256', env.cashfree.webhookSecret)
      .update(timestamp + rawBody)
      .digest('base64');
    return timingSafeEqual(expected, signature);
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
        logger.error(`[cashfree] ${method} ${path} failed`, json);
        throw new BadRequestError(`Cashfree error: ${(json as any).message ?? 'unknown'}`);
      }
      return json;
    } catch (err) {
      logger.error(`[cashfree] request failed ${method} ${path}`, err);
      throw err;
    }
  }
}

export const cashfreeGateway = new CashfreeGateway();
