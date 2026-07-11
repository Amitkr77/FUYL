import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { subscriptionService } from '../services/subscription.service';
import { success, created, paginate } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import {
  createSubscriptionSchema,
  updateFrequencySchema,
  cancelSubscriptionSchema,
  skipDeliverySchema,
} from '../validators';
import { assertSubscriptionOwnership } from '../middleware/ownership.middleware';

export class SubscriptionController {
  create = [
    validate(createSubscriptionSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const sub = await subscriptionService.create(req.user!.userId, req.body);
        return created(res, sub);
      } catch (err) { next(err); }
    },
  ];

  listMine = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const status = req.query.status as string | undefined;
      const subs = await subscriptionService.listMine(req.user!.userId, status);
      // Same enrichment as the admin listing (subscription.controller admin.controller.ts) —
      // attach product name so the storefront doesn't need an N+1 lookup per row.
      const { ProductModel } = await import('../../catalog/models/product.model');
      const productIds = [...new Set(subs.map((s) => s.productId.toString()))];
      const products = await ProductModel.find({ _id: { $in: productIds } }, { name: 1, media: 1 });
      const byId = new Map(products.map((p) => [p._id.toString(), p]));
      const items = subs.map((s) => {
        const p = byId.get(s.productId.toString());
        return {
          ...s.toObject(),
          productName: p?.name ?? 'Unknown product',
          productImage: p?.media?.[0]?.url ?? '',
        };
      });
      return success(res, items);
    } catch (err) { next(err); }
  };

  get = [
    assertSubscriptionOwnership,
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, res.locals.subscription);
      } catch (err) { next(err); }
    },
  ];

  pause = [
    assertSubscriptionOwnership,
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await subscriptionService.pause(req.params.id, req.user!.userId));
      } catch (err) { next(err); }
    },
  ];

  resume = [
    assertSubscriptionOwnership,
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await subscriptionService.resume(req.params.id, req.user!.userId));
      } catch (err) { next(err); }
    },
  ];

  skipNext = [
    assertSubscriptionOwnership,
    validate(skipDeliverySchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await subscriptionService.skipNext(req.params.id, req.user!.userId, req.body.cycleNumber));
      } catch (err) { next(err); }
    },
  ];

  changeFrequency = [
    assertSubscriptionOwnership,
    validate(updateFrequencySchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await subscriptionService.changeFrequency(req.params.id, req.user!.userId, req.body));
      } catch (err) { next(err); }
    },
  ];

  cancel = [
    assertSubscriptionOwnership,
    validate(cancelSubscriptionSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await subscriptionService.cancel(req.params.id, req.user!.userId, req.body));
      } catch (err) { next(err); }
    },
  ];

  listDeliveries = [
    assertSubscriptionOwnership,
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await subscriptionService.listDeliveries(req.params.id));
      } catch (err) { next(err); }
    },
  ];

  listEvents = [
    assertSubscriptionOwnership,
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await subscriptionService.listEvents(req.params.id));
      } catch (err) { next(err); }
    },
  ];
}

export const subscriptionController = new SubscriptionController();
