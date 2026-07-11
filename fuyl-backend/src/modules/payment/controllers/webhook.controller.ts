import { Request, Response, NextFunction } from 'express';
import { razorpayGateway } from '../utils/razorpay';
import { paymentService } from '../services';
import { UnauthorizedError } from '../../../shared/errors';
import { logger } from '../../../config/logger';

/**
 * Raw-body webhook receiver for Razorpay one-off order payment events
 * (payment.captured / payment.authorized / payment.failed).
 *
 * Before this route existed, order-payment confirmation depended entirely
 * on the client reliably calling POST /payments/verify after checkout — if
 * that call never fired (closed tab, dropped network), the order stayed
 * "pending" forever with no server-side reconciliation. PaymentService's
 * handleWebhookEvent already existed but was never wired to a route (dead
 * code) until now.
 *
 * IMPORTANT: must be registered in app.ts BEFORE express.json(), same as
 * the subscription webhook, so the raw body is available for signature
 * verification.
 */
export async function razorpayPaymentWebhookHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});

    if (!razorpayGateway.verifyWebhookSignature(rawBody, signature ?? '')) {
      logger.warn('[webhook] razorpay payment signature mismatch');
      return next(new UnauthorizedError('Invalid Razorpay signature'));
    }

    const parsed = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    await paymentService.handleWebhookEvent(parsed.event as string, parsed);
    return res.status(200).json({ received: true });
  } catch (err) {
    logger.error('[webhook] razorpay payment handler error', err);
    return res.status(500).json({ received: false });
  }
}
