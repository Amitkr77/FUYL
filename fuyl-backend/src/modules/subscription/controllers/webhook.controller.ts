import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { razorpayWebhookService } from '../services/razorpayWebhook.service';
import { razorpayService } from '../utils/razorpay.service';
import { UnauthorizedError } from '../../../shared/errors';
import { logger } from '../../../config/logger';

/**
 * Raw-body webhook receiver for Razorpay subscription events.
 * IMPORTANT: this route MUST be registered BEFORE express.json() middleware
 * so that the raw body is available for signature verification.
 */
export async function razorpayWebhookHandler(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});

    if (!razorpayService.verifyWebhookSignature(rawBody, signature ?? '')) {
      logger.warn('[webhook] razorpay signature mismatch');
      return next(new UnauthorizedError('Invalid Razorpay signature'));
    }

    const parsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const event = parsed.event as string;
    await razorpayWebhookService.handle(event, parsed);
    return res.status(200).json({ received: true });
  } catch (err) {
    logger.error('[webhook] razorpay handler error', err);
    return res.status(500).json({ received: false });
  }
}
