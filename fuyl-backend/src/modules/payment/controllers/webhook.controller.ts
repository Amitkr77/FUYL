import { Request, Response, NextFunction } from 'express';
import { cashfreeGateway } from '../utils/cashfree';
import { paymentService } from '../services';
import { UnauthorizedError } from '../../../shared/errors';
import { logger } from '../../../config/logger';

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

    if (!cashfreeGateway.verifyWebhookSignature(timestamp ?? '', rawBody, signature ?? '')) {
      logger.warn('[webhook] cashfree payment signature mismatch');
      return next(new UnauthorizedError('Invalid Cashfree signature'));
    }

    const parsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    await paymentService.handleWebhookEvent(parsed.type as string, parsed);
    return res.status(200).json({ received: true });
  } catch (err) {
    logger.error('[webhook] cashfree payment handler error', err);
    return res.status(500).json({ received: false });
  }
}
