import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { cashfreeSubscriptionWebhookService } from '../services/cashfreeSubscriptionWebhook.service';
import { cashfreeSubscriptionService } from '../utils/cashfreeSubscription.service';
import { UnauthorizedError } from '../../../shared/errors';
import { logger } from '../../../config/logger';
import { WebhookEventModel } from '../../payment/models';

/**
 * Raw-body webhook receiver for Cashfree subscription events.
 * MUST be registered BEFORE express.json() in app.ts so the raw body is
 * available for signature verification (base64 HMAC of timestamp + body).
 */
export async function cashfreeSubscriptionWebhookHandler(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});

    const parsedTimestamp = Number(timestamp);
    const timestampMs = parsedTimestamp < 10_000_000_000 ? parsedTimestamp * 1000 : parsedTimestamp;
    const maxClockSkewMs = 5 * 60 * 1000;
    if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > maxClockSkewMs) {
      logger.warn('[webhook] cashfree subscription timestamp is stale or invalid');
      return next(new UnauthorizedError('Invalid Cashfree webhook timestamp'));
    }

    if (!cashfreeSubscriptionService.verifyWebhookSignature(timestamp ?? '', rawBody, signature ?? '')) {
      logger.warn('[webhook] cashfree subscription signature mismatch');
      return next(new UnauthorizedError('Invalid Cashfree signature'));
    }

    const parsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventType = String(parsed?.type ?? 'unknown');
    const subscriptionId = String(
      parsed?.data?.subscription_details?.subscription_id
      ?? parsed?.data?.subscription_id
      ?? parsed?.data?.cf_subscription_id
      ?? 'unknown-subscription',
    );
    const paymentId = String(parsed?.data?.subscription_payment_details?.cf_payment_id ?? 'no-payment');
    // Cashfree retries the same signed delivery with the same webhook
    // timestamp. Including it keeps repeated status-change events distinct
    // while making an exact delivery replay idempotent.
    const eventKey = `cashfree-subscription:${eventType}:${subscriptionId}:${paymentId}:${timestamp}`;

    try {
      await WebhookEventModel.create({ eventKey, provider: 'cashfree', eventType, status: 'processing' });
    } catch (claimErr: any) {
      if (claimErr?.code === 11000) {
        logger.info('[webhook] duplicate cashfree subscription event ignored', { eventKey });
        return res.status(200).json({ received: true, duplicate: true });
      }
      throw claimErr;
    }

    try {
      await cashfreeSubscriptionWebhookService.handle(eventType, parsed);
      await WebhookEventModel.updateOne(
        { eventKey },
        { $set: { status: 'processed', processedAt: new Date() } },
      );
    } catch (processingErr) {
      // A failed attempt must remain retryable when Cashfree redelivers it.
      await WebhookEventModel.deleteOne({ eventKey, status: 'processing' });
      throw processingErr;
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    logger.error('[webhook] cashfree subscription handler error', err);
    return res.status(500).json({ received: false });
  }
}
