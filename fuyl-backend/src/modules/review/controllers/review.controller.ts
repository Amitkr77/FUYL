import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { reviewService } from '../services';
import { success, created, paginate } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import {
  createReviewSchema,
  updateReviewSchema,
  sellerReplySchema,
  moderationSchema,
} from '../validators';

export class ReviewController {
  create = [
    validate(createReviewSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const authorName = (req.user?.email ?? 'Anonymous').split('@')[0];
        return created(res, await reviewService.create(req.user!.userId, authorName, req.body));
      } catch (err) { next(err); }
    },
  ];

  getById = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await reviewService.getById(req.params.id));
    } catch (err) { next(err); }
  };

  listByProduct = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Math.min(Number(req.query.limit ?? 20), 100);
      const result = await reviewService.listByProduct(req.params.productId, page, limit);
      return paginate(res, result.items, result.total, result.page, result.limit);
    } catch (err) { next(err); }
  };

  getRatingSummary = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await reviewService.getRatingSummary(req.params.productId));
    } catch (err) { next(err); }
  };

  listMine = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await reviewService.listMine(req.user!.userId));
    } catch (err) { next(err); }
  };

  update = [
    validate(updateReviewSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await reviewService.update(req.params.id, req.user!.userId, req.body));
      } catch (err) { next(err); }
    },
  ];

  delete = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      await reviewService.delete(req.params.id, req.user!.userId, req.user!.role);
      return success(res, { deleted: true });
    } catch (err) { next(err); }
  };

  markHelpful = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      await reviewService.markHelpful(req.params.id);
      return success(res, { marked: true });
    } catch (err) { next(err); }
  };

  report = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      await reviewService.report(req.params.id);
      return success(res, { reported: true });
    } catch (err) { next(err); }
  };

  sellerReply = [
    validate(sellerReplySchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await reviewService.sellerReply(req.params.id, req.user!.userId, req.body));
      } catch (err) { next(err); }
    },
  ];

  // Admin
  listPending = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Math.min(Number(req.query.limit ?? 50), 200);
      const result = await reviewService.listPending(page, limit);
      return paginate(res, result.items, result.total, result.page, result.limit);
    } catch (err) { next(err); }
  };

  listFlagged = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await reviewService.listFlagged());
    } catch (err) { next(err); }
  };

  listAll = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Math.min(Number(req.query.limit ?? 20), 100);
      const filter: Record<string, unknown> = {};
      if (req.query.status) filter.status = req.query.status;
      if (req.query.productId) filter.productId = req.query.productId;
      if (req.query.userId) filter.userId = req.query.userId;
      const result = await reviewService.listAll(filter, page, limit);
      return paginate(res, result.items, result.total, result.page, result.limit);
    } catch (err) { next(err); }
  };

  moderate = [
    validate(moderationSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await reviewService.moderate(req.params.id, req.user!.userId, req.body));
      } catch (err) { next(err); }
    },
  ];
}

export const reviewController = new ReviewController();
