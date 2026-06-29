import crypto from 'crypto';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import { BadRequestError } from '../../../shared/errors';

/**
 * Razorpay Orders & Payments REST wrapper.
 * Used for one-time order payments (subscription recurring charges are handled
 * via Razorpay Subscriptions API in the subscription module).
 */
class RazorpayGateway {
  private get authHeader(): string {
    if (!env.razorpay.keyId || !env.razorpay.keySecret) {
      throw new BadRequestError('Razorpay credentials not configured');
    }
    return 'Basic ' + Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString('base64');
  }

  private get baseUrl(): string {
    return 'https://api.razorpay.com/v1';
  }

  async createOrder(params: {
    amount: number;          // in paise
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<{ id: string; amount: number; currency: string; receipt: string; status: string }> {
    return this.request('/orders', 'POST', params);
  }

  async fetchOrder(id: string): Promise<any> {
    return this.request(`/orders/${id}`, 'GET');
  }

  async fetchPayment(id: string): Promise<any> {
    return this.request(`/payments/${id}`, 'GET');
  }

  async capturePayment(paymentId: string, amount: number, currency: string): Promise<any> {
    return this.request(`/payments/${paymentId}/capture`, 'POST', { amount, currency });
  }

  async refund(paymentId: string, params: { amount?: number; notes?: Record<string, string> }): Promise<any> {
    return this.request(`/payments/${paymentId}/refund`, 'POST', params);
  }

  verifyPaymentSignature(opts: { orderId: string; paymentId: string; signature: string }): boolean {
    const { orderId, paymentId, signature } = opts;
    const expected = crypto
      .createHmac('sha256', env.razorpay.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    return expected === signature;
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!env.razorpay.webhookSecret) return false;
    const expected = crypto
      .createHmac('sha256', env.razorpay.webhookSecret)
      .update(rawBody)
      .digest('hex');
    return expected === signature;
  }

  private async request(path: string, method: string, body?: unknown): Promise<any> {
    const url = `${this.baseUrl}${path}`;
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.authHeader,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!res.ok) {
        logger.error(`[razorpay] ${method} ${path} failed`, json);
        throw new BadRequestError(`Razorpay error: ${(json as any).error?.description ?? 'unknown'}`);
      }
      return json;
    } catch (err) {
      logger.error(`[razorpay] request failed ${method} ${path}`, err);
      throw err;
    }
  }
}

export const razorpayGateway = new RazorpayGateway();
