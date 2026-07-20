import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { validate } from '../../../shared/middleware/validate.middleware';
import { created, success } from '../../../shared/responses';
import { marketingService } from '../services';
import {
  contactMessageSchema,
  newsletterSubscribeSchema,
  newsletterVerifySchema,
  newsletterUnsubscribeSchema,
  newsletterResendSchema,
} from '../validators';

export class MarketingController {
  submitContact = [
    validate(contactMessageSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return created(res, await marketingService.submitContactMessage(req.body)); }
      catch (err) { next(err); }
    },
  ];

  subscribeNewsletter = [
    validate(newsletterSubscribeSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await marketingService.subscribeNewsletter(req.body)); }
      catch (err) { next(err); }
    },
  ];

  verifyNewsletter = [
    validate(newsletterVerifySchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await marketingService.verifyNewsletter(req.body)); }
      catch (err) { next(err); }
    },
  ];

  unsubscribeNewsletter = [
    validate(newsletterUnsubscribeSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await marketingService.unsubscribeNewsletter(req.body)); }
      catch (err) { next(err); }
    },
  ];

  resendNewsletterVerification = [
    validate(newsletterResendSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try { return success(res, await marketingService.resendVerification(req.body)); }
      catch (err) { next(err); }
    },
  ];
}

export const marketingController = new MarketingController();
