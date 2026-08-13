import { AlertCircle, Search } from "lucide-react";
import { AffiliatesTable } from "@/components/affiliates/AffiliatesTable";
import { AddAffiliateDialog } from "@/components/affiliates/AddAffiliateDialog";
import { getAffiliateStats, listAffiliates } from "@/lib/affiliate";
import { getErrorMessage } from "@/lib/api";

export default async function AffiliateMembersPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string; page?: string }> }) {
  const query = await searchParams;
  const page = Math.max(1, Number(query.page) || 1);
  let affiliatesData = { items: [] as Awaited<ReturnType<typeof listAffiliates>>["items"], total: 0 };
  let stats: Awaited<ReturnType<typeof getAffiliateStats>> | null = null;
  let error = "";

  try {
    [affiliatesData, stats] = await Promise.all([listAffiliates({ limit: 20, page, search: query.search, status: query.status as Parameters<typeof listAffiliates>[0] extends { status?: infer T } ? T : never }), getAffiliateStats()]);
  } catch (err) {
    error = getErrorMessage(err, "Could not load affiliates.");
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Affiliates</h2>
          <p className="text-sm text-slate-500">
            {stats?.affiliates.total ?? 0} total · {stats?.affiliates.approved ?? 0} approved · {stats?.affiliates.pending ?? 0} pending review
          </p>
        </div>
        <AddAffiliateDialog />
      </div>
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}
      <form className="flex flex-wrap gap-2 rounded-xl border border-slate-100 bg-white p-4">
        <div className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="search" defaultValue={query.search} placeholder="Search name, email, or phone" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[#558476]" /></div>
        <select name="status" defaultValue={query.status ?? ""} className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600"><option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="suspended">Suspended</option><option value="rejected">Rejected</option></select>
        <button className="rounded-lg bg-[#558476] px-4 py-2 text-sm font-semibold text-white">Apply filters</button>
      </form>
      <AffiliatesTable affiliates={affiliatesData.items} total={affiliatesData.total} />
    </div>
  );
}
