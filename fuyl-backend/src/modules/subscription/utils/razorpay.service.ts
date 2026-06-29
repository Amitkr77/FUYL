import crypto from 'crypto';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';
import { BadRequestError } from '../../../shared/errors';

/**
 * Minimal Razorpay Subscriptions API wrapper.
 * In production you'd use the `razorpay` npm package — this is a typed wrapper
 * around the REST endpoints we actually use.
 */
class RazorpayService {
  private get authHeader(): string {
    if (!env.razorpay.keyId || !env.razorpay.keySecret) {
      throw new BadRequestError('Razorpay credentials not configured');
    }
    return 'Basic ' + Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString('base64');
  }

  private get baseUrl(): string {
    return 'https://api.razorpay.com/v1';
  }

  async createPlan(params: {
    period: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    item: { name: string; amount: number; currency: string; description?: string };
    notes?: Record<string, string>;
  }): Promise<{ id: string }> {
    return this.request('/plans', 'POST', params);
  }

  async createSubscription(params: {
    plan_id: string;
    customer_id?: string;
    total_count?: number;
    quantity: number;
    customer_notify: 0 | 1;
    start_at?: number;
    expire_by?: number;
    notes?: Record<string, string>;
    addons?: unknown[];
  }): Promise<{
    id: string;
    status: string;
    charge_at: number;
    current_start: number;
    current_end: number;
  }> {
    return this.request('/subscriptions', 'POST', params);
  }

  async cancelSubscription(id: string, cancelAtCycle = false): Promise<{ id: string; status: string }> {
    return this.request(`/subscriptions/${id}/cancel`, 'POST', { cancel_at_cycle: cancelAtCycle ? 1 : 0 });
  }

  async pauseSubscription(id: string): Promise<{ id: string; status: string }> {
    return this.request(`/subscriptions/${id}/pause`, 'POST', { pause_at: 'now' });
  }

  async resumeSubscription(id: string): Promise<{ id: string; status: string }> {
    return this.request(`/subscriptions/${id}/resume`, 'POST', { resume_at: 'now' });
  }

  async fetchSubscription(id: string): Promise<unknown> {
    return this.request(`/subscriptions/${id}`, 'GET');
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
        throw new BadRequestError(`Razorpay error: ${(json as { error?: { description?: string } }).error?.description ?? 'unknown'}`);
      }
      return json;
    } catch (err) {
      logger.error(`[razorpay] request failed ${method} ${path}`, err);
      throw err;
    }
  }
}

export const razorpayService = new RazorpayService();
