import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { checkoutService } from '../services';
import { success } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import { checkoutSchema } from '../validators';

export class CheckoutController {
  preview = [
    validate(checkoutSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const result = await checkoutService.preview(req.user!.userId, req.body);
        return success(res, result);
      } catch (err) { next(err); }
    },
  ];

  placeOrder = [
    validate(checkoutSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const result = await checkoutService.placeOrder(req.user!.userId, req.body);
        return success(res, result);
      } catch (err) { next(err); }
    },
  ];
}

export const checkoutController = new CheckoutController();
