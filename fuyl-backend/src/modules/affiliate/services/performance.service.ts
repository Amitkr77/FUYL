import { Types } from 'mongoose';
import { AffiliateClickModel } from '../models/click.model';
import { CommissionModel } from '../models/commission.model';
import { CommissionStatus } from '../../../shared/enums';

export type PerformanceTab = 'referrals' | 'commission' | 'sales' | 'clicks';

export interface PerformanceDataPoint {
  date: string;  // ISO date string — day precision e.g. "2026-07-15"
  value: number;
}

export class PerformanceService {
  /**
   * Returns a time-series array (one entry per day) for the requested tab.
   * Days with no data are gap-filled with value = 0 so the chart always has
   * a continuous x-axis without gaps.
   */
  async getPerformance(
    affiliateId: string,
    params: { from: string; to: string; tab: PerformanceTab }
  ): Promise<PerformanceDataPoint[]> {
    const { from, to, tab } = params;
    const fromDate = new Date(from);
    const toDate   = new Date(to);

    // Clamp to reasonable range (max 366 days)
    const diffMs = toDate.getTime() - fromDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 0 || diffDays > 366) {
      return [];
    }

    const aff = new Types.ObjectId(affiliateId);

    let rawMap: Map<string, number>;

    switch (tab) {
      case 'clicks':
        rawMap = await this.aggregateClicks(aff, fromDate, toDate);
        break;
      case 'referrals':
        rawMap = await this.aggregateReferrals(aff, fromDate, toDate);
        break;
      case 'commission':
        rawMap = await this.aggregateCommissionAmount(aff, fromDate, toDate);
        break;
      case 'sales':
        rawMap = await this.aggregateSales(aff, fromDate, toDate);
        break;
      default:
        rawMap = new Map();
    }

    return this.fillGaps(fromDate, toDate, rawMap);
  }

  // ── Aggregations ───────────────────────────────────────────────────────────

  /** Count clicks per day from affiliate_clicks. */
  private async aggregateClicks(
    affiliateId: Types.ObjectId,
    from: Date,
    to: Date
  ): Promise<Map<string, number>> {
    const rows = await AffiliateClickModel.aggregate([
      {
        $match: {
          affiliateId,
          createdAt: { $gte: from, $lte: to },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
          value: { $sum: 1 },
        },
      },
    ]);
    return this.rowsToMap(rows);
  }

  /** Count commission records (referrals) per day from affiliate_commissions. */
  private async aggregateReferrals(
    affiliateId: Types.ObjectId,
    from: Date,
    to: Date
  ): Promise<Map<string, number>> {
    const rows = await CommissionModel.aggregate([
      {
        $match: {
          affiliateId,
          createdAt: { $gte: from, $lte: to },
          status: { $nin: [CommissionStatus.CANCELLED, CommissionStatus.REVERSED] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
          value: { $sum: 1 },
        },
      },
    ]);
    return this.rowsToMap(rows);
  }

  /** Sum commission amounts per day (excludes cancelled/reversed). */
  private async aggregateCommissionAmount(
    affiliateId: Types.ObjectId,
    from: Date,
    to: Date
  ): Promise<Map<string, number>> {
    const rows = await CommissionModel.aggregate([
      {
        $match: {
          affiliateId,
          createdAt: { $gte: from, $lte: to },
          status: { $nin: [CommissionStatus.CANCELLED, CommissionStatus.REVERSED] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
          value: { $sum: '$amount' },
        },
      },
    ]);
    return this.rowsToMap(rows);
  }

  /** Sum base sale amounts per day (the order subtotal the commission was applied to). */
  private async aggregateSales(
    affiliateId: Types.ObjectId,
    from: Date,
    to: Date
  ): Promise<Map<string, number>> {
    const rows = await CommissionModel.aggregate([
      {
        $match: {
          affiliateId,
          createdAt: { $gte: from, $lte: to },
          status: { $nin: [CommissionStatus.CANCELLED, CommissionStatus.REVERSED] },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
          value: { $sum: '$baseAmount' },
        },
      },
    ]);
    return this.rowsToMap(rows);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private rowsToMap(rows: { _id: string; value: number }[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const row of rows) map.set(row._id, row.value);
    return map;
  }

  /**
   * Walk every calendar day from `from` to `to` (inclusive) and emit a
   * data point — defaulting to 0 for days missing from the aggregation result.
   */
  private fillGaps(from: Date, to: Date, data: Map<string, number>): PerformanceDataPoint[] {
    const points: PerformanceDataPoint[] = [];
    const cursor = new Date(from);
    cursor.setUTCHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setUTCHours(23, 59, 59, 999);

    while (cursor <= end) {
      const key = cursor.toISOString().slice(0, 10); // "YYYY-MM-DD"
      points.push({ date: key, value: data.get(key) ?? 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return points;
  }
}

export const performanceService = new PerformanceService();
