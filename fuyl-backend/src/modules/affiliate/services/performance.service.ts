import { Types } from 'mongoose';
import { AffiliateClickModel } from '../models/click.model';
import { CommissionModel } from '../models/commission.model';
import { CommissionStatus } from '../../../shared/enums';
import { AffiliateModel } from '../models/affiliate.model';
import { AffiliateAttributionModel } from '../models/attribution.model';
import mongoose from 'mongoose';
import { fromPaise, toPaise } from '../../../shared/utils';

export type PerformanceTab = 'referrals' | 'commission' | 'sales' | 'clicks';

export interface PerformanceDataPoint {
  date: string;  // ISO date string — day precision e.g. "2026-07-15"
  value: number;
}

export class PerformanceService {
  async adminAnalytics(params: { from: string; to: string; affiliateId?: string; programId?: string }) {
    const from = new Date(params.from); const to = new Date(params.to); to.setHours(23, 59, 59, 999);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from || to.getTime() - from.getTime() > 366 * 86400000) return null;
    let affiliateIds: mongoose.Types.ObjectId[] | undefined;
    if (params.affiliateId) affiliateIds = [new mongoose.Types.ObjectId(params.affiliateId)];
    else if (params.programId) affiliateIds = (await AffiliateModel.find({ programId: params.programId }).select('_id').lean()).map(a => a._id);
    const affMatch = affiliateIds ? { affiliateId: { $in: affiliateIds } } : {};
    const dateMatch = { createdAt: { $gte: from, $lte: to } };
    const valid = { status: { $nin: [CommissionStatus.CANCELLED, CommissionStatus.REVERSED] } };
    const [commissionRows, clickRows, statusRows, methodRows, topAffiliates, registered, totalAffiliateCount] = await Promise.all([
      CommissionModel.aggregate([{ $match: { ...affMatch, ...dateMatch, ...valid } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, referrals: { $sum: 1 }, sales: { $sum: '$baseAmount' }, commission: { $sum: '$amount' } } }]),
      AffiliateClickModel.aggregate([{ $match: { ...affMatch, ...dateMatch } }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, clicks: { $sum: 1 } } }]),
      CommissionModel.aggregate([{ $match: { ...affMatch, ...dateMatch } }, { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } }]),
      AffiliateAttributionModel.aggregate([{ $match: { ...affMatch, ...dateMatch, converted: true } }, { $group: { _id: '$method', count: { $sum: 1 } } }]),
      CommissionModel.aggregate([{ $match: { ...affMatch, ...dateMatch, ...valid } }, { $group: { _id: '$affiliateId', sales: { $sum: '$baseAmount' }, commission: { $sum: '$amount' }, referrals: { $sum: 1 } } }, { $sort: { sales: -1 } }, { $limit: 10 }, { $lookup: { from: 'affiliates', localField: '_id', foreignField: '_id', as: 'affiliate' } }, { $unwind: '$affiliate' }, { $project: { name: '$affiliate.name', email: '$affiliate.email', sales: 1, commission: 1, referrals: 1 } }]),
      AffiliateModel.countDocuments({ ...(params.programId ? { programId: params.programId } : {}), ...(params.affiliateId ? { _id: params.affiliateId } : {}), createdAt: { $gte: from, $lte: to } }),
      AffiliateModel.countDocuments({ ...(params.programId ? { programId: params.programId } : {}), ...(params.affiliateId ? { _id: params.affiliateId } : {}) }),
    ]);
    for (const row of commissionRows) {
      row.sales = fromPaise(toPaise(row.sales ?? 0));
      row.commission = fromPaise(toPaise(row.commission ?? 0));
    }
    for (const row of statusRows) row.total = fromPaise(toPaise(row.total ?? 0));
    for (const row of topAffiliates) {
      row.sales = fromPaise(toPaise(row.sales ?? 0));
      row.commission = fromPaise(toPaise(row.commission ?? 0));
    }
    const commissions = new Map(commissionRows.map(r => [r._id, r])); const clicks = new Map(clickRows.map(r => [r._id, r.clicks]));
    const series=[]; const cursor=new Date(from); cursor.setHours(0,0,0,0); while(cursor<=to){const date=cursor.toISOString().slice(0,10);const c=commissions.get(date);series.push({date,clicks:clicks.get(date)??0,referrals:c?.referrals??0,sales:c?.sales??0,commission:c?.commission??0});cursor.setDate(cursor.getDate()+1)}
    const totals=series.reduce((a,d)=>({clicks:a.clicks+d.clicks,referrals:a.referrals+d.referrals,salesPaise:a.salesPaise+toPaise(d.sales),commissionPaise:a.commissionPaise+toPaise(d.commission)}),{clicks:0,referrals:0,salesPaise:0,commissionPaise:0});
    const sales = fromPaise(totals.salesPaise);
    const commission = fromPaise(totals.commissionPaise);
    return { range: { from: params.from, to: params.to }, totals: { clicks: totals.clicks, referrals: totals.referrals, sales, commission, affiliates: totalAffiliateCount, newAffiliates: registered, conversionRate: totals.clicks ? totals.referrals / totals.clicks * 100 : 0, averageOrderValue: totals.referrals ? fromPaise(Math.round(totals.salesPaise / totals.referrals)) : 0, commissionPerClick: totals.clicks ? fromPaise(Math.round(totals.commissionPaise / totals.clicks)) : 0, returnOnCommission: commission ? sales / commission : 0 }, series, commissionBreakdown: statusRows.map(r=>({status:r._id,count:r.count,total:r.total})), attributionBreakdown: methodRows.map(r=>({method:r._id,count:r.count})), topAffiliates };
  }
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
    for (const row of rows) map.set(row._id, fromPaise(toPaise(row.value)));
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
