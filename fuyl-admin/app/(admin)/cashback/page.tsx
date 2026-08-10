import Link from "next/link";
import { Plus, AlertCircle } from "lucide-react";
import { PoliciesTable } from "@/components/cashback/PoliciesTable";
import { EarningsTable } from "@/components/cashback/EarningsTable";
import { listCashbackPolicies, listCashbackEarnings } from "@/lib/cashback";
import { getErrorMessage } from "@/lib/api";

export default async function CashbackPage() {
  let policies: Awaited<ReturnType<typeof listCashbackPolicies>> = [];
  let earnings: Awaited<ReturnType<typeof listCashbackEarnings>> = { items: [], total: 0 };
  let error = "";

  try {
    [policies, earnings] = await Promise.all([
      listCashbackPolicies(),
      listCashbackEarnings({ limit: 50 }),
    ]);
  } catch (err) {
    error = getErrorMessage(err, "Could not load cashback data.");
  }

  const activeCount  = policies.filter((p) => p.isActive).length;
  const totalEarned  = earnings.items.reduce((s, e) => (e.status === "credited" ? s + e.cashbackAmount : s), 0);
  const pendingCount = earnings.items.filter((e) => e.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Cashback</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {policies.length} {policies.length === 1 ? "policy" : "policies"} · {activeCount} active
          </p>
        </div>
        <Link
          href="/cashback/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Policy
        </Link>
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
          { label: "Active Policies",    value: activeCount,                                         sub: `of ${policies.length} total` },
          { label: "Cashback Credited",  value: `₹${totalEarned.toLocaleString("en-IN")}`,           sub: "last 20 earnings" },
          { label: "Pending Credits",    value: pendingCount,                                         sub: "awaiting trigger" },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-100 px-5 py-4">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{c.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{c.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* Policies */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-700">Policies</h3>
        <PoliciesTable policies={policies} />
      </section>

      {/* Earnings audit */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Recent Earnings</h3>
          <span className="text-xs text-slate-400">{earnings.total} total</span>
        </div>
        <EarningsTable earnings={earnings.items} total={earnings.total} />
      </section>
    </div>
  );
}
