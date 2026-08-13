import Link from "next/link";
import { AlertCircle, Banknote, ChevronRight, Link2, MousePointerClick, ShoppingBag, Users } from "lucide-react";
import StatsCard from "@/components/ui/StatsCard";
import { getAffiliateAnalytics, getAffiliateStats, listAffiliates } from "@/lib/affiliate";
import { getErrorMessage } from "@/lib/api";

export default async function AffiliateOverviewPage() {
  let stats: Awaited<ReturnType<typeof getAffiliateStats>> | null = null;
  let recent: Awaited<ReturnType<typeof listAffiliates>>["items"] = [];
  let analytics: Awaited<ReturnType<typeof getAffiliateAnalytics>> | null = null;
  let error = "";

  try {
    const to = new Date().toISOString().slice(0, 10);
    const fromDate = new Date(); fromDate.setDate(fromDate.getDate() - 29);
    const [statsData, affiliateData, analyticsData] = await Promise.all([
      getAffiliateStats(),
      listAffiliates({ limit: 5 }),
      getAffiliateAnalytics({ from: fromDate.toISOString().slice(0, 10), to }),
    ]);
    stats = statsData;
    recent = affiliateData.items;
    analytics = analyticsData;
  } catch (err) {
    error = getErrorMessage(err, "Could not load affiliate overview.");
  }

  const commissionTotal = analytics?.totals.commission ?? 0;
  const clicks = analytics?.totals.clicks ?? 0;
  const orders = analytics?.totals.referrals ?? 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Overview</h2>
          <p className="text-sm text-slate-500">A current snapshot of your affiliate channel.</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600">
          Last 30 days
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatsCard icon={Banknote} label="Commission value" value={`₹${commissionTotal.toLocaleString("en-IN")}`} sub="Earned in the selected period" />
        <StatsCard icon={ShoppingBag} label="Referrals" value={orders.toLocaleString("en-IN")} sub="Converted affiliate orders" />
        <StatsCard icon={MousePointerClick} label="Clicks" value={clicks.toLocaleString("en-IN")} sub="Tracked affiliate-link visits" />
        <StatsCard icon={Users} label="Affiliates" value={(stats?.affiliates.total ?? 0).toLocaleString("en-IN")} sub={`${stats?.affiliates.pending ?? 0} awaiting review`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="rounded-2xl border border-slate-100 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h3 className="font-semibold text-slate-900">Recent affiliates</h3>
              <p className="mt-0.5 text-xs text-slate-500">Latest partner registrations</p>
            </div>
            <Link href="/affiliates/members" className="inline-flex items-center gap-1 text-sm font-medium text-[#315f52] hover:text-[#12291F]">
              View all <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
          {recent.length ? (
            <div className="divide-y divide-slate-100">
              {recent.map((affiliate) => (
                <div key={affiliate.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{affiliate.name}</p>
                    <p className="truncate text-xs text-slate-400">{affiliate.email}</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">
                    {affiliate.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-5 py-12 text-center text-sm text-slate-400">No affiliates have registered yet.</p>
          )}
        </section>

        <section className="rounded-2xl border border-slate-100 bg-white p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#558476]/10 text-[#315f52]">
            <Link2 className="h-5 w-5" />
          </div>
          <h3 className="mt-4 font-semibold text-slate-900">Affiliate program</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Configure commission rules, attribution windows, and payout requirements for your partners.
          </p>
          <Link href="/affiliates/programs" className="mt-5 inline-flex items-center gap-1 rounded-lg bg-[#12291F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1c3b2e]">
            Manage programs <ChevronRight className="h-4 w-4" />
          </Link>
        </section>
      </div>
    </div>
  );
}
