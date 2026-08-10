"use client";

import { CashbackEarning } from "@/lib/cashback";

interface Props {
  earnings: CashbackEarning[];
  total: number;
}

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-amber-50 text-amber-700 border-amber-100",
  credited: "bg-green-50 text-green-700 border-green-100",
  reversed: "bg-red-50 text-red-700 border-red-100",
  expired:  "bg-slate-100 text-slate-500 border-slate-200",
};

export function EarningsTable({ earnings, total }: Props) {
  if (earnings.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm bg-white rounded-xl border border-slate-100">
        No cashback earnings found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/60">
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Order</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Policy</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Base</th>
            <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cashback</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Timing</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {earnings.map((e) => {
            const policyName =
              e.policyId && typeof e.policyId === "object"
                ? (e.policyId as { name: string }).name
                : "—";
            return (
              <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                  {e.orderId.slice(-8).toUpperCase()}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  <div>{policyName}</div>
                  {e.couponCode && (
                    <span className="text-[11px] font-mono text-slate-400">{e.couponCode}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-slate-500 tabular-nums">
                  ₹{e.cashbackBase.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-[#558476] tabular-nums">
                  ₹{e.cashbackAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 capitalize">
                  {e.creditTiming.replace(/_/g, " ")}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[e.status] ?? ""}`}>
                    {e.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-slate-400">
                  {new Date(e.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="px-4 py-2.5 border-t border-slate-100 text-xs text-slate-400">
        Showing {earnings.length} of {total} earnings
      </div>
    </div>
  );
}
