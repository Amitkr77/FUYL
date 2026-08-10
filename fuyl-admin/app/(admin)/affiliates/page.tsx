import { AlertCircle } from "lucide-react";
import { AffiliatesTable } from "@/components/affiliates/AffiliatesTable";
import { listAffiliates, getAffiliateStats } from "@/lib/affiliate";
import { getErrorMessage } from "@/lib/api";

export default async function AffiliatesPage() {
  let affiliatesData = { items: [] as Awaited<ReturnType<typeof listAffiliates>>["items"], total: 0 };
  let stats: Awaited<ReturnType<typeof getAffiliateStats>> | null = null;
  let error = "";

  try {
    [affiliatesData, stats] = await Promise.all([
      listAffiliates({ limit: 50 }),
      getAffiliateStats(),
    ]);
  } catch (err) {
    error = getErrorMessage(err, "Could not load affiliate data.");
  }

  const pending   = stats?.affiliates.pending   ?? 0;
  const approved  = stats?.affiliates.approved  ?? 0;
  const totalComm = stats?.commissions?.payable?.total ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Affiliates</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {stats?.affiliates.total ?? 0} total · {approved} approved · {pending} pending review
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Pending Review", value: pending,                                         sub: "awaiting approval" },
          { label: "Active Affiliates", value: approved,                                     sub: "approved & running" },
          { label: "Payable Commission", value: `₹${totalComm.toLocaleString("en-IN")}`,     sub: "ready to pay out" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-100 px-5 py-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{c.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{c.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Pending first */}
      {pending > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700">Pending Applications</h3>
          <AffiliatesTable
            affiliates={affiliatesData.items.filter((a) => a.status === "pending")}
            total={pending}
          />
        </section>
      )}

      {/* All affiliates */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">All Affiliates</h3>
          <span className="text-xs text-slate-400">{affiliatesData.total} total</span>
        </div>
        <AffiliatesTable affiliates={affiliatesData.items} total={affiliatesData.total} />
      </section>
    </div>
  );
}
