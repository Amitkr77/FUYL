import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { ForbiddenError, NotFoundError } from '../../../shared/errors';
import { Response, NextFunction } from 'express';
import { SubscriptionRepository } from '../repositories/subscription.repository';

const subscriptionRepo = new SubscriptionRepository();

export async function assertSubscriptionOwnership(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const sub = await subscriptionRepo.findById(req.params.id);
    if (!sub) return next(new NotFoundError('Subscription'));
    if (sub.customerId.toString() !== req.user!.userId && req.user!.role !== 'admin' && req.user!.role !== 'super_admin') {
      return next(new ForbiddenError('You do not own this subscription'));
    }
    res.locals.subscription = sub;
    next();
  } catch (err) { next(err); }
}

export function assertActiveSubscription(req: AuthedRequest, res: Response, next: NextFunction) {
  const sub = res.locals.subscription;
  if (!sub) return next(new NotFoundError('Subscription'));
  if (sub.status !== 'active' && sub.status !== 'paused') {
    return next(new ForbiddenError(`Cannot perform action on subscription in status: ${sub.status}`));
  }
  next();
}
