import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { success, paginate } from '../../../shared/responses';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { NotFoundError } from '../../../shared/errors';
import { newsletterSubscriberRepository } from '../repositories';
import { marketingService } from '../services';
import type { NewsletterStatus } from '../models/newsletterSubscriber.model';
import { PrebookingLeadModel } from '../models';

const VALID_STATUSES: NewsletterStatus[] = ['pending', 'active', 'unsubscribed'];

export class AdminNewsletterController {
  // Aggregate counts for the dashboard stat cards.
  stats = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (_req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await newsletterSubscriberRepository.statsForAdmin());
      } catch (err) { next(err); }
    },
  ];

  list = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = Math.min(parseInt(req.query.limit as string) || 20, 500);
        const filter: Record<string, unknown> = {};

        const status = req.query.status as NewsletterStatus | undefined;
        if (status && VALID_STATUSES.includes(status)) filter.status = status;

        // Free-text search on the email address.
        const search = (req.query.search as string)?.trim();
        if (search) filter.email = { $regex: search, $options: 'i' };

        const r = await newsletterSubscriberRepository.paginate(filter, page, limit);
        return paginate(res, r.items, r.total, r.page, r.limit);
      } catch (err) { next(err); }
    },
  ];

  // Resend the double opt-in confirmation email for a pending subscriber.
  resendVerification = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const sub = await newsletterSubscriberRepository.findByEmail(
          req.params.email
        );
        if (!sub) throw new NotFoundError('Subscriber');
        await marketingService.resendVerification({ email: sub.email });
        return success(res, { sent: true });
      } catch (err) { next(err); }
    },
  ];

  // Hard-delete — for scrubbing invalid/bounced addresses. (Normal opt-outs
  // keep their row with status "unsubscribed" to preserve consent history.)
  remove = [
    authorize(Roles.SUPER_ADMIN, Roles.ADMIN),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const deleted = await newsletterSubscriberRepository.deleteById(req.params.id);
        if (!deleted) throw new NotFoundError('Subscriber');
        return success(res, { deleted: true });
      } catch (err) { next(err); }
    },
  ];
}

export const adminNewsletterController = new AdminNewsletterController();

export class AdminPrebookingController {
  list = [authorize(Roles.SUPER_ADMIN, Roles.ADMIN), async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
      const search = (req.query.search as string)?.trim();
      const filter = search ? { $or: ['name', 'email', 'phone'].map((field) => ({ [field]: { $regex: search, $options: 'i' } })) } : {};
      const [items, total] = await Promise.all([
        PrebookingLeadModel.find(filter).sort({ submittedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
        PrebookingLeadModel.countDocuments(filter),
      ]);
      return paginate(res, items, total, page, limit);
    } catch (err) { next(err); }
  }];

  stats = [authorize(Roles.SUPER_ADMIN, Roles.ADMIN), async (_req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const [total, today, donationInterested] = await Promise.all([PrebookingLeadModel.countDocuments(), PrebookingLeadModel.countDocuments({ submittedAt: { $gte: start } }), PrebookingLeadModel.countDocuments({ wantsToDonate: true })]);
      return success(res, { total, today, capacity: 500, remaining: Math.max(0, 500 - total), donationInterested });
    } catch (err) { next(err); }
  }];
}

export const adminPrebookingController = new AdminPrebookingController();
