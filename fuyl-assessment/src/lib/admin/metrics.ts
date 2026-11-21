import "server-only";
import { connectDB } from "@/lib/db";
import { AuditLog } from "@/models/admin";
import { AssessmentSession, Submission } from "@/models/assessment";
import { SyncRun, SyncState } from "@/models/store";

export interface DashboardMetrics {
  days: number;
  funnel: { started: number; completed: number; stopped: number; submitted: number; clicked: number };
  topAreas: { name: string; count: number }[];
  safety: { level: string; count: number }[];
  dropOff: { lastAnswered: string; count: number }[];
  daily: { date: string; submissions: number }[];
  recentActivity: { at: Date; actor?: string; action: string; target?: string }[];
  sync: { lastSuccessAt?: Date; labelReviewNeeded: boolean; lastStatus?: string; stale: boolean };
}

/** Aggregates for the admin dashboard over the last `days` days (IST buckets). */
export async function getDashboardMetrics(days = 30): Promise<DashboardMetrics> {
  await connectDB();
  const since = new Date(Date.now() - days * 86_400_000);
  const idleCutoff = new Date(Date.now() - 60 * 60_000); // abandoned = untouched for 1h

  const [started, completed, stopped, submitted, clicked, topAreas, safety, dropOff, daily, recentActivity, syncState, lastRun] = await Promise.all([
    AssessmentSession.countDocuments({ startedAt: { $gte: since } }),
    AssessmentSession.countDocuments({ startedAt: { $gte: since }, completedAt: { $exists: true } }),
    AssessmentSession.countDocuments({ startedAt: { $gte: since }, status: "stopped" }),
    Submission.countDocuments({ createdAt: { $gte: since } }),
    Submission.countDocuments({ createdAt: { $gte: since }, ctaClickedAt: { $exists: true } }),
    Submission.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: since } } },
      { $unwind: "$result.areas" },
      { $group: { _id: "$result.areas.name", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 11 },
    ]),
    Submission.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: "$result.safety.level", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    AssessmentSession.aggregate<{ _id: string; count: number }>([
      { $match: { startedAt: { $gte: since }, status: "active", updatedAt: { $lt: idleCutoff } } },
      { $project: { last: { $ifNull: [{ $arrayElemAt: ["$path", -1] }, "(before the first question)"] } } },
      { $group: { _id: "$last", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
    Submission.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: new Date(Date.now() - 14 * 86_400_000) } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    AuditLog.find({ action: { $ne: "login.failed" } }).sort({ at: -1 }).limit(8).lean(),
    SyncState.findById("singleton").lean(),
    SyncRun.findOne().sort({ startedAt: -1 }).lean(),
  ]);

  // Fill in empty days so the chart has a steady 14-day axis.
  const byDate = new Map(daily.map((d) => [d._id, d.count]));
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
  const series = Array.from({ length: 14 }, (_, i) => {
    const date = fmt.format(new Date(Date.now() - (13 - i) * 86_400_000));
    return { date, submissions: byDate.get(date) ?? 0 };
  });

  return {
    days,
    funnel: { started, completed, stopped, submitted, clicked },
    topAreas: topAreas.map((a) => ({ name: a._id, count: a.count })),
    safety: safety.map((s) => ({ level: s._id ?? "none", count: s.count })),
    dropOff: dropOff.map((d) => ({ lastAnswered: d._id, count: d.count })),
    daily: series,
    recentActivity: recentActivity.map((a) => ({ at: a.at as Date, actor: a.actor ?? undefined, action: a.action, target: a.target ?? undefined })),
    sync: {
      lastSuccessAt: syncState?.lastSuccessAt ?? undefined,
      labelReviewNeeded: Boolean(syncState?.labelReviewNeeded),
      lastStatus: lastRun?.status,
      stale: !syncState?.lastSuccessAt || Date.now() - new Date(syncState.lastSuccessAt).getTime() > 3 * 86_400_000,
    },
  };
}
