import { AnalyticsEventModel, AnalyticsMetricModel } from '../models/event.model';
import { logger } from '../../../config/logger';

class AnalyticsQueryService {
  /**
   * Get top metrics over a time range.
   */
  async summary(days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [eventsByType, totalsByType, revenueTotal] = await Promise.all([
      AnalyticsEventModel.aggregate([
        { $match: { occurredAt: { $gte: since } } },
        { $group: { _id: '$event', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AnalyticsEventModel.aggregate([
        { $match: { occurredAt: { $gte: since }, value: { $gt: 0 } } },
        { $group: { _id: '$event', total: { $sum: '$value' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      AnalyticsEventModel.aggregate([
        { $match: { occurredAt: { $gte: since }, event: { $in: ['order.placed', 'subscription.charged'] } } },
        { $group: { _id: null, total: { $sum: '$value' } } },
      ]),
    ]);

    return {
      since,
      eventsByType,
      totalsByType,
      revenueTotal: revenueTotal[0]?.total ?? 0,
    };
  }

  /**
   * Time-series for a specific metric.
   */
  async timeseries(event: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const series = await AnalyticsEventModel.aggregate([
      { $match: { event, occurredAt: { $gte: since } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$occurredAt' },
          },
          count: { $sum: 1 },
          value: { $sum: { $ifNull: ['$value', 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return series.map((s) => ({ date: s._id, count: s.count, value: s.value }));
  }

  /**
   * Recent events for the admin activity feed.
   */
  async recentEvents(limit = 50, filter: Record<string, unknown> = {}) {
    return AnalyticsEventModel
      .find(filter)
      .sort({ occurredAt: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Daily/monthly rolled-up metrics.
   */
  async metrics(metric?: string, bucket: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'day', limit = 30) {
    const filter: Record<string, unknown> = { bucket };
    if (metric) filter.metric = metric;
    return AnalyticsMetricModel
      .find(filter)
      .sort({ bucketStart: -1 })
      .limit(limit)
      .lean();
  }
}

export const analyticsQueryService = new AnalyticsQueryService();
