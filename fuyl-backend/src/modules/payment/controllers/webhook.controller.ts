import { Request, Response, NextFunction } from 'express';
import { cashfreeGateway } from '../utils/cashfree';
import { paymentService } from '../services';
import { UnauthorizedError } from '../../../shared/errors';
import { logger } from '../../../config/logger';
import { WebhookEventModel } from '../models';

/**
 * Raw-body webhook receiver for Cashfree order-payment events
 * (PAYMENT_SUCCESS_WEBHOOK / PAYMENT_FAILED_WEBHOOK / PAYMENT_USER_DROPPED_WEBHOOK).
 *
 * This is the server-side backstop for order-payment confirmation: if the
 * client never calls POST /payments/verify after checkout (closed tab, dropped
 * network), this reconciles the order instead of leaving it "pending" forever.
 *
 * Cashfree signs with base64(HMAC-SHA256(`${x-webhook-timestamp}${rawBody}`)).
 * MUST be registered in app.ts BEFORE express.json() so the raw body is intact
 * for signature verification.
 */
export async function cashfreePaymentWebhookHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = req.headers['x-webhook-signature'] as string;
    const timestamp = req.headers['x-webhook-timestamp'] as string;
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});

    // A valid signature alone is replayable forever. Cashfree sends epoch
    // milliseconds; tolerate epoch seconds as well and reject stale/future
    // requests outside a narrow delivery window.
    const parsedTimestamp = Number(timestamp);
    const timestampMs = parsedTimestamp < 10_000_000_000 ? parsedTimestamp * 1000 : parsedTimestamp;
    const maxClockSkewMs = 5 * 60 * 1000;
    if (!Number.isFinite(timestampMs) || Math.abs(Date.now() - timestampMs) > maxClockSkewMs) {
      logger.warn('[webhook] cashfree payment timestamp is stale or invalid');
      return next(new UnauthorizedError('Invalid Cashfree webhook timestamp'));
    }

    if (!cashfreeGateway.verifyWebhookSignature(timestamp ?? '', rawBody, signature ?? '')) {
      logger.warn('[webhook] cashfree payment signature mismatch');
      return next(new UnauthorizedError('Invalid Cashfree signature'));
    }

    const parsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventType = String(parsed?.type ?? 'unknown');
    const orderId = String(parsed?.data?.order?.order_id ?? 'unknown-order');
    const paymentId = String(parsed?.data?.payment?.cf_payment_id ?? 'unknown-payment');
    const eventKey = `cashfree:${eventType}:${orderId}:${paymentId}`;

    try {
      await WebhookEventModel.create({ eventKey, provider: 'cashfree', eventType, status: 'processing' });
    } catch (claimErr: any) {
      if (claimErr?.code === 11000) {
        logger.info('[webhook] duplicate cashfree payment event ignored', { eventKey });
        return res.status(200).json({ received: true, duplicate: true });
      }
      throw claimErr;
    }

    try {
      await paymentService.handleWebhookEvent(eventType, parsed);
      await WebhookEventModel.updateOne(
        { eventKey },
        { $set: { status: 'processed', processedAt: new Date() } }
      );
    } catch (processingErr) {
      // Release an unfinished claim so a genuine provider retry can recover.
      await WebhookEventModel.deleteOne({ eventKey, status: 'processing' });
      throw processingErr;
    }
    return res.status(200).json({ received: true });
  } catch (err) {
    logger.error('[webhook] cashfree payment handler error', err);
    return res.status(500).json({ received: false });
  }
}
