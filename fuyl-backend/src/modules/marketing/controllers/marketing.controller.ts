import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { validate } from '../../../shared/middleware/validate.middleware';
import { created, success } from '../../../shared/responses';
import { marketingService } from '../services';
import { contactMessageSchema, newsletterSubscribeSchema } from '../validators';

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
}

export const marketingController = new MarketingController();
