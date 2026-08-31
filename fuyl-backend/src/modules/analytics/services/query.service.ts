import { AnalyticsEventModel, AnalyticsMetricModel } from '../models/event.model';
import { CartModel } from '../../cart/models/cart.model';
import { OrderModel } from '../../order/models/order.model';
import { fromPaise, toPaise } from '../../../shared/utils';

function dateRange(days: number, from?: string, to?: string): { since: Date; until: Date } {
  const until = to ? new Date(to) : new Date();
  const since = from ? new Date(from) : new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return { since, until };
}

class AnalyticsQueryService {
  /** Top-level summary over a date range. */
  async summary(days = 30, from?: string, to?: string) {
    const { since, until } = dateRange(days, from, to);

    const [eventsByType, totalsByType, revenueTotal] = await Promise.all([
      AnalyticsEventModel.aggregate([
        { $match: { occurredAt: { $gte: since, $lte: until } } },
        { $group: { _id: '$event', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AnalyticsEventModel.aggregate([
        { $match: { occurredAt: { $gte: since, $lte: until }, value: { $gt: 0 } } },
        { $group: { _id: '$event', total: { $sum: '$value' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      AnalyticsEventModel.aggregate([
        { $match: { occurredAt: { $gte: since, $lte: until }, event: { $in: ['order.placed', 'subscription.charged'] } } },
        { $group: { _id: null, total: { $sum: '$value' } } },
      ]),
    ]);

    return {
      since,
      until,
      eventsByType,
      totalsByType: totalsByType.map((row) => ({ ...row, total: fromPaise(toPaise(row.total ?? 0)) })),
      revenueTotal: fromPaise(toPaise(revenueTotal[0]?.total ?? 0)),
    };
  }

  /** Time-series for a specific event (supports custom date range). */
  async timeseries(event: string, days = 30, from?: string, to?: string) {
    const { since, until } = dateRange(days, from, to);
    const series = await AnalyticsEventModel.aggregate([
      { $match: { event, occurredAt: { $gte: since, $lte: until } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$occurredAt' } },
          count: { $sum: 1 },
          value: { $sum: { $ifNull: ['$value', 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return series.map((s) => ({ date: s._id, count: s.count, value: fromPaise(toPaise(s.value ?? 0)) }));
  }

  /** Revenue timeseries grouped by day/week/month. */
  async revenueTimeseries(granularity: 'day' | 'week' | 'month' = 'day', days = 30, from?: string, to?: string) {
    const { since, until } = dateRange(days, from, to);
    const fmtMap = { day: '%Y-%m-%d', week: '%Y-%U', month: '%Y-%m' };
    const series = await AnalyticsEventModel.aggregate([
      { $match: { event: 'order.placed', occurredAt: { $gte: since, $lte: until } } },
      {
        $group: {
          _id: { $dateToString: { format: fmtMap[granularity], date: '$occurredAt' } },
          revenue: { $sum: { $ifNull: ['$value', 0] } },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    return series.map((s) => ({ date: s._id, revenue: fromPaise(toPaise(s.revenue ?? 0)), orders: s.orders }));
  }

  /** Count of abandoned carts (not converted, has items, idle > 1 hour). */
  async cartAbandonmentCount(): Promise<number> {
    const idleSince = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    return CartModel.countDocuments({
      isConverted: false,
      itemCount: { $gt: 0 },
      lastActivityAt: { $lt: idleSince },
    });
  }

  /** Conversion funnel: Visitors → Product Views → Add to Cart → Checkout → Payment → Orders */
  async funnel(days = 30, from?: string, to?: string) {
    const { since, until } = dateRange(days, from, to);
    const events = ['page.view', 'product.viewed', 'cart.add', 'checkout.started', 'payment.initiated', 'order.placed'];
    const results = await AnalyticsEventModel.aggregate([
      { $match: { event: { $in: events }, occurredAt: { $gte: since, $lte: until } } },
      { $group: { _id: '$event', count: { $sum: 1 } } },
    ]);
    const byEvent = Object.fromEntries(results.map((r) => [r._id, r.count]));
    return [
      { step: 'Visitors',        event: 'page.view',          count: byEvent['page.view']          ?? 0 },
      { step: 'Product Views',   event: 'product.viewed',     count: byEvent['product.viewed']     ?? 0 },
      { step: 'Add to Cart',     event: 'cart.add',           count: byEvent['cart.add']           ?? 0 },
      { step: 'Checkout',        event: 'checkout.started',   count: byEvent['checkout.started']   ?? 0 },
      { step: 'Payment',         event: 'payment.initiated',  count: byEvent['payment.initiated']  ?? 0 },
      { step: 'Successful Orders', event: 'order.placed',     count: byEvent['order.placed']       ?? 0 },
    ];
  }

  /** Activity heatmap: event counts per hour (0-23) × day-of-week (1=Sun…7=Sat). */
  async heatmap(days = 30, from?: string, to?: string) {
    const { since, until } = dateRange(days, from, to);
    const raw = await AnalyticsEventModel.aggregate([
      { $match: { occurredAt: { $gte: since, $lte: until } } },
      {
        $group: {
          _id: {
            hour: { $hour: '$occurredAt' },
            dayOfWeek: { $dayOfWeek: '$occurredAt' },
          },
          count: { $sum: 1 },
        },
      },
    ]);
    // Flatten to { hour, day, count } — frontend renders as grid
    return raw.map((r) => ({ hour: r._id.hour, day: r._id.dayOfWeek, count: r.count }));
  }

  /** Device type and OS breakdown from tracked page-view events. */
  async deviceBreakdown(days = 30, from?: string, to?: string) {
    const { since, until } = dateRange(days, from, to);
    const [devices, oses] = await Promise.all([
      AnalyticsEventModel.aggregate([
        { $match: { occurredAt: { $gte: since, $lte: until }, 'properties.deviceType': { $exists: true, $ne: null } } },
        { $group: { _id: '$properties.deviceType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AnalyticsEventModel.aggregate([
        { $match: { occurredAt: { $gte: since, $lte: until }, 'properties.os': { $exists: true, $ne: null } } },
        { $group: { _id: '$properties.os', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);
    return {
      devices: devices.map((d) => ({ name: d._id ?? 'Unknown', value: d.count })),
      oses:    oses.map((o)    => ({ name: o._id ?? 'Unknown', value: o.count })),
    };
  }

  /** Per-session user activity log (last N sessions). */
  async userActivity(limit = 50, days = 30, from?: string, to?: string) {
    const { since, until } = dateRange(days, from, to);
    const sessions = await AnalyticsEventModel.aggregate([
      { $match: { occurredAt: { $gte: since, $lte: until } } },
      { $sort: { occurredAt: -1 } },
      {
        $group: {
          _id: { $ifNull: ['$sessionId', { $toString: '$userId' }] },
          userId:      { $first: '$userId' },
          pages:       { $addToSet: '$page' },
          events:      { $addToSet: '$event' },
          deviceType:  { $first: '$properties.deviceType' },
          os:          { $first: '$properties.os' },
          lat:         { $first: '$properties.lat' },
          lng:         { $first: '$properties.lng' },
          city:        { $first: '$properties.city' },
          lastSeen:    { $first: '$occurredAt' },
          startedAt:   { $last: '$occurredAt' },
          totalTimeMs: { $sum: { $ifNull: ['$properties.timeSpentMs', 0] } },
          eventCount:  { $sum: 1 },
        },
      },
      { $sort: { lastSeen: -1 } },
      { $limit: limit },
    ]);
    return sessions.map((s) => {
      const eventSet = new Set<string>(s.events as string[]);
      const outcome: 'purchased' | 'abandoned' | 'browsed' = eventSet.has('order.placed')
        ? 'purchased'
        : eventSet.has('cart.add') || eventSet.has('checkout.started')
        ? 'abandoned'
        : 'browsed';
      return {
        sessionId:   s._id ?? '—',
        userId:      s.userId?.toString() ?? null,
        pages:       (s.pages as (string | null)[]).filter(Boolean),
        deviceType:  s.deviceType ?? 'Unknown',
        os:          s.os ?? 'Unknown',
        lat:         s.lat ?? null,
        lng:         s.lng ?? null,
        city:        (s.city as string | null) ?? null,
        lastSeen:    s.lastSeen,
        startedAt:   s.startedAt,
        totalTimeMs: s.totalTimeMs,
        eventCount:  s.eventCount,
        outcome,
      };
    });
  }

  /** Lat/lng data points for geographic map display. */
  async geography(days = 30, from?: string, to?: string) {
    const { since, until } = dateRange(days, from, to);
    const points = await AnalyticsEventModel.aggregate([
      {
        $match: {
          occurredAt: { $gte: since, $lte: until },
          'properties.lat': { $exists: true, $ne: null },
          'properties.lng': { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: { lat: '$properties.lat', lng: '$properties.lng' },
          count: { $sum: 1 },
          city:  { $first: '$properties.city' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 500 },
    ]);
    return points.map((p) => ({
      lat:   p._id.lat as number,
      lng:   p._id.lng as number,
      count: p.count as number,
      city:  (p.city as string | null) ?? null,
    }));
  }

  /** Repeat vs new customers breakdown. */
  async customerSegments(days = 30, from?: string, to?: string) {
    const { since, until } = dateRange(days, from, to);
    const [segments] = await OrderModel.aggregate([
      { $match: { createdAt: { $gte: since, $lte: until } } },
      { $group: { _id: '$customerId', orderCount: { $sum: 1 } } },
      {
        $group: {
          _id: null,
          newCustomers:    { $sum: { $cond: [{ $eq: ['$orderCount', 1] }, 1, 0] } },
          repeatCustomers: { $sum: { $cond: [{ $gt: ['$orderCount', 1] }, 1, 0] } },
        },
      },
    ]);
    return {
      newCustomers:    segments?.newCustomers    ?? 0,
      repeatCustomers: segments?.repeatCustomers ?? 0,
    };
  }

  /** Orders grouped by status. */
  async ordersByStatus(days = 30, from?: string, to?: string) {
    const { since, until } = dateRange(days, from, to);
    const results = await OrderModel.aggregate([
      { $match: { createdAt: { $gte: since, $lte: until } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    return results.map((r) => ({ status: r._id as string, count: r.count as number }));
  }

  /** Top-selling products aggregated from order items. */
  async topProducts(limit = 10, days = 30, from?: string, to?: string) {
    const { since, until } = dateRange(days, from, to);
    const results = await OrderModel.aggregate([
      { $match: { createdAt: { $gte: since, $lte: until }, status: { $nin: ['cancelled', 'returned'] } } },
      { $unwind: '$items' },
      {
        $group: {
          _id:       '$items.name',
          revenue:   { $sum: '$items.totalPrice' },
          unitsSold: { $sum: '$items.quantity' },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
    ]);
    return results.map((r) => ({ name: r._id as string, revenue: fromPaise(toPaise(r.revenue ?? 0)), unitsSold: r.unitsSold }));
  }

  /** Recent events for the admin activity feed. */
  async recentEvents(limit = 50, filter: Record<string, unknown> = {}) {
    return AnalyticsEventModel.find(filter).sort({ occurredAt: -1 }).limit(limit).lean();
  }

  /** Rolled-up metric buckets. */
  async metrics(metric?: string, bucket: 'minute' | 'hour' | 'day' | 'week' | 'month' = 'day', limit = 30) {
    const filter: Record<string, unknown> = { bucket };
    if (metric) filter.metric = metric;
    return AnalyticsMetricModel.find(filter).sort({ bucketStart: -1 }).limit(limit).lean();
  }
}

export const analyticsQueryService = new AnalyticsQueryService();
