import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { cashfreeSubscriptionWebhookService } from '../services/cashfreeSubscriptionWebhook.service';
import { cashfreeSubscriptionService } from '../utils/cashfreeSubscription.service';
import { UnauthorizedError } from '../../../shared/errors';
import { logger } from '../../../config/logger';

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

    if (!cashfreeSubscriptionService.verifyWebhookSignature(timestamp ?? '', rawBody, signature ?? '')) {
      logger.warn('[webhook] cashfree subscription signature mismatch');
      return next(new UnauthorizedError('Invalid Cashfree signature'));
    }

    const parsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    await cashfreeSubscriptionWebhookService.handle(parsed.type as string, parsed);
    return res.status(200).json({ received: true });
  } catch (err) {
    logger.error('[webhook] cashfree subscription handler error', err);
    return res.status(500).json({ received: false });
  }
}
