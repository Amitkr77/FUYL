import { Request, Response, NextFunction } from 'express';
import { AuthedRequest } from '../../../shared/middleware/auth.middleware';
import { analyticsQueryService, rollupMetrics } from '../services';
import { trackEvent } from '../services/analytics.service';
import { success } from '../../../shared/responses';

export class AnalyticsController {
  summary = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const days = Number(req.query.days ?? 30);
      const from = req.query.from as string | undefined;
      const to   = req.query.to   as string | undefined;
      return success(res, await analyticsQueryService.summary(days, from, to));
    } catch (err) { next(err); }
  };

  timeseries = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const event = req.params.event;
      const days = Number(req.query.days ?? 30);
      const from = req.query.from as string | undefined;
      const to   = req.query.to   as string | undefined;
      return success(res, await analyticsQueryService.timeseries(event, days, from, to));
    } catch (err) { next(err); }
  };

  revenueTimeseries = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const granularity = (req.query.granularity as 'day' | 'week' | 'month') ?? 'day';
      const days = Number(req.query.days ?? 30);
      const from = req.query.from as string | undefined;
      const to   = req.query.to   as string | undefined;
      return success(res, await analyticsQueryService.revenueTimeseries(granularity, days, from, to));
    } catch (err) { next(err); }
  };

  cartAbandonment = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const count = await analyticsQueryService.cartAbandonmentCount();
      return success(res, { count });
    } catch (err) { next(err); }
  };

  funnel = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const days = Number(req.query.days ?? 30);
      const from = req.query.from as string | undefined;
      const to   = req.query.to   as string | undefined;
      return success(res, await analyticsQueryService.funnel(days, from, to));
    } catch (err) { next(err); }
  };

  heatmap = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const days = Number(req.query.days ?? 30);
      const from = req.query.from as string | undefined;
      const to   = req.query.to   as string | undefined;
      return success(res, await analyticsQueryService.heatmap(days, from, to));
    } catch (err) { next(err); }
  };

  deviceBreakdown = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const days = Number(req.query.days ?? 30);
      const from = req.query.from as string | undefined;
      const to   = req.query.to   as string | undefined;
      return success(res, await analyticsQueryService.deviceBreakdown(days, from, to));
    } catch (err) { next(err); }
  };

  userActivity = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(Number(req.query.limit ?? 50), 200);
      const days = Number(req.query.days ?? 30);
      const from = req.query.from as string | undefined;
      const to   = req.query.to   as string | undefined;
      return success(res, await analyticsQueryService.userActivity(limit, days, from, to));
    } catch (err) { next(err); }
  };

  geography = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const days = Number(req.query.days ?? 30);
      const from = req.query.from as string | undefined;
      const to   = req.query.to   as string | undefined;
      return success(res, await analyticsQueryService.geography(days, from, to));
    } catch (err) { next(err); }
  };

  customerSegments = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const days = Number(req.query.days ?? 30);
      const from = req.query.from as string | undefined;
      const to   = req.query.to   as string | undefined;
      return success(res, await analyticsQueryService.customerSegments(days, from, to));
    } catch (err) { next(err); }
  };

  ordersByStatus = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const days = Number(req.query.days ?? 30);
      const from = req.query.from as string | undefined;
      const to   = req.query.to   as string | undefined;
      return success(res, await analyticsQueryService.ordersByStatus(days, from, to));
    } catch (err) { next(err); }
  };

  topProducts = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(Number(req.query.limit ?? 10), 50);
      const days = Number(req.query.days ?? 30);
      const from = req.query.from as string | undefined;
      const to   = req.query.to   as string | undefined;
      return success(res, await analyticsQueryService.topProducts(limit, days, from, to));
    } catch (err) { next(err); }
  };

  recentEvents = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(Number(req.query.limit ?? 50), 500);
      const filter: Record<string, unknown> = {};
      if (req.query.event)  filter.event  = req.query.event;
      if (req.query.userId) filter.userId = req.query.userId;
      return success(res, await analyticsQueryService.recentEvents(limit, filter));
    } catch (err) { next(err); }
  };

  metrics = async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      const metric = req.query.metric as string | undefined;
      const bucket = (req.query.bucket as any) ?? 'day';
      const limit  = Number(req.query.limit ?? 30);
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

  /** Public endpoint — storefront sends page-view events here (no auth). */
  track = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        event = 'page.view', sessionId, userId, page, referrer, utm,
        properties = {},
      } = req.body as Record<string, unknown>;
      const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ?? req.ip;
      const userAgent = req.headers['user-agent'];
      await trackEvent({
        event:      String(event),
        sessionId:  sessionId  ? String(sessionId)  : undefined,
        userId:     userId     ? String(userId)      : undefined,
        page:       page       ? String(page)        : undefined,
        referrer:   referrer   ? String(referrer)    : undefined,
        utm:        utm as any,
        properties: properties as Record<string, unknown>,
        ip,
        userAgent,
      });
      return success(res, { tracked: true });
    } catch (err) { next(err); }
  };
}

export const analyticsController = new AnalyticsController();
