import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { notificationService, notificationAdminService } from '../services';
import { NotificationLogRepository } from '../repositories/notificationLog.repository';
import { success, created, paginate } from '../../../shared/responses';
import { validate } from '../../../shared/middleware/validate.middleware';
import {
  templateSchema,
  updateTemplateSchema,
  preferenceSchema,
  categoryOverrideSchema,
} from '../validators';

const logRepo = new NotificationLogRepository();

export class NotificationController {
  // ─── User-facing ──────────────────────────────────────────────
  listMine = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(Number(req.query.limit ?? 50), 200);
      const items = await logRepo.findByUser(req.user!.userId, limit);
      return success(res, items);
    } catch (err) { next(err); }
  };

  getPreferences = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const prefs = await notificationAdminService.getPreferences(req.user!.userId);
      return success(res, prefs);
    } catch (err) { next(err); }
  };

  updatePreferences = [
    validate(preferenceSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const updated = await notificationAdminService.updatePreferences(req.user!.userId, req.body);
        return success(res, updated);
      } catch (err) { next(err); }
    },
  ];

  setCategoryOverride = [
    validate(categoryOverrideSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        const updated = await notificationAdminService.setCategoryOverride(
          req.user!.userId,
          req.body.category,
          req.body.preference
        );
        return success(res, updated);
      } catch (err) { next(err); }
    },
  ];

  // ─── Admin: Templates ─────────────────────────────────────────
  listTemplates = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const filter: Record<string, unknown> = {};
      if (req.query.channel) filter.channel = req.query.channel;
      if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
      const items = await notificationAdminService.listTemplates(filter);
      return success(res, items);
    } catch (err) { next(err); }
  };

  getTemplate = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      return success(res, await notificationAdminService.getTemplate(req.params.id));
    } catch (err) { next(err); }
  };

  createTemplate = [
    validate(templateSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return created(res, await notificationAdminService.createTemplate(req.body));
      } catch (err) { next(err); }
    },
  ];

  updateTemplate = [
    validate(updateTemplateSchema),
    async (req: AuthedRequest, res: Response, next: NextFunction) => {
      try {
        return success(res, await notificationAdminService.updateTemplate(req.params.id, req.body));
      } catch (err) { next(err); }
    },
  ];

  deactivateTemplate = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      await notificationAdminService.deactivateTemplate(req.params.id);
      return success(res, { deactivated: true });
    } catch (err) { next(err); }
  };

  // ─── Admin: Logs ──────────────────────────────────────────────
  listLogs = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const page = Number(req.query.page ?? 1);
      const limit = Math.min(Number(req.query.limit ?? 20), 100);
      const filter: Record<string, unknown> = {};
      if (req.query.status) filter.status = req.query.status;
      if (req.query.channel) filter.channel = req.query.channel;
      if (req.query.template) filter.template = req.query.template;
      if (req.query.userId) filter.userId = req.query.userId;
      const result = await logRepo.paginate(filter, page, limit);
      return paginate(res, result.items, result.total, result.page, result.limit);
    } catch (err) { next(err); }
  };

  retryFailed = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const count = await notificationService.retryFailed();
      return success(res, { retried: count });
    } catch (err) { next(err); }
  };

  stats = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const stats = await logRepo.stats();
      return success(res, stats);
    } catch (err) { next(err); }
  };
}

export const notificationController = new NotificationController();
