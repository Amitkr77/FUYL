import { Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { authorize, Roles } from '../../../shared/middleware/rbac.middleware';
import { analyticsQueryService, rollupMetrics } from '../services';
import { success } from '../../../shared/responses';

export class AnalyticsController {
  summary = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const days = Number(req.query.days ?? 30);
      return success(res, await analyticsQueryService.summary(days));
    } catch (err) { next(err); }
  };

  timeseries = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const event = req.params.event;
      const days = Number(req.query.days ?? 30);
      return success(res, await analyticsQueryService.timeseries(event, days));
    } catch (err) { next(err); }
  };

  recentEvents = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(Number(req.query.limit ?? 50), 500);
      const filter: Record<string, unknown> = {};
      if (req.query.event) filter.event = req.query.event;
      if (req.query.userId) filter.userId = req.query.userId;
      return success(res, await analyticsQueryService.recentEvents(limit, filter));
    } catch (err) { next(err); }
  };

  metrics = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const metric = req.query.metric as string | undefined;
      const bucket = (req.query.bucket as any) ?? 'day';
      const limit = Number(req.query.limit ?? 30);
      return success(res, await analyticsQueryService.metrics(metric, bucket, limit));
    } catch (err) { next(err); }
  };

  forceRollup = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const bucket = (req.body.bucket as 'hour' | 'day' | 'month') ?? 'day';
      const n = await rollupMetrics(bucket);
      return success(res, { rolledUp: n, bucket });
    } catch (err) { next(err); }
  };
}

export const analyticsController = new AnalyticsController();
