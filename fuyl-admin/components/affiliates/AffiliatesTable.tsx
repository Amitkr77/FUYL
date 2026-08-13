"use client";

import { useState } from "react";
import Link from "next/link";
import { Affiliate } from "@/lib/affiliate";
import { approveAffiliateAction, rejectAffiliateAction, suspendAffiliateAction, payoutAffiliateAction, reactivateAffiliateAction } from "@/app/(admin)/affiliates/actions";

interface Props {
  affiliates: Affiliate[];
  total: number;
}

const STATUS_STYLES: Record<string, string> = {
  pending:   "bg-amber-50 text-amber-700 border-amber-100",
  approved:  "bg-green-50 text-green-700 border-green-100",
  rejected:  "bg-red-50 text-red-700 border-red-100",
  suspended: "bg-slate-100 text-slate-500 border-slate-200",
};

export function AffiliatesTable({ affiliates, total }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError]     = useState<string>("");
  const [reasonDialog, setReasonDialog] = useState<{
    id: string;
    kind: "reject" | "suspend";
    reason: string;
  } | null>(null);

  async function run(id: string, action: () => Promise<{ error: string } | null>) {
    setLoading(id);
    setError("");
    const res = await action();
    if (res?.error) setError(res.error);
    setLoading(null);
  }

  function submitReason() {
    if (!reasonDialog?.reason.trim()) return;
    const { id, kind, reason } = reasonDialog;
    setReasonDialog(null);
    void run(id, () => kind === "reject"
      ? rejectAffiliateAction(id, reason)
      : suspendAffiliateAction(id, reason));
  }

  if (affiliates.length === 0) {
    return (
      <div className="text-center py-12 text-slate-400 text-sm bg-white rounded-xl border border-slate-100">
        No affiliates found.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Affiliate</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Channels</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Clicks</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Orders</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Revenue</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Commission</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {affiliates.map((a) => (
              <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/affiliates/members/${a.id}`} className="font-medium text-slate-800 hover:text-[#315f52] hover:underline">{a.name}</Link>
                  <div className="text-xs text-slate-400">{a.email}</div>
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {a.channels.length > 0 ? a.channels.join(", ") : "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                  {a.stats.totalClicks.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                  {a.stats.totalOrders.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                  ₹{a.stats.totalRevenue.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-semibold text-[#558476]">
                  ₹{a.stats.totalCommissionEarned.toLocaleString("en-IN")}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[a.status] ?? ""}`}>
                    {a.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1.5 flex-wrap">
                    {a.status === "pending" && (
                      <>
                        <button
                          disabled={loading === a.id}
                          onClick={() => run(a.id, () => approveAffiliateAction(a.id))}
                          className="px-2.5 py-1 text-xs rounded-lg bg-green-50 text-green-700 hover:bg-green-100 border border-green-100 disabled:opacity-50 transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          disabled={loading === a.id}
                          onClick={() => setReasonDialog({ id: a.id, kind: "reject", reason: "" })}
                          className="px-2.5 py-1 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 disabled:opacity-50 transition-colors"
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {a.status === "approved" && (
                      <>
                        <button
                          disabled={loading === a.id}
                          onClick={() => setReasonDialog({ id: a.id, kind: "suspend", reason: "" })}
                          className="px-2.5 py-1 text-xs rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-100 disabled:opacity-50 transition-colors"
                        >
                          Suspend
                        </button>
                        <button
                          disabled={loading === a.id}
                          onClick={() => run(a.id, () => payoutAffiliateAction(a.id))}
                          className="px-2.5 py-1 text-xs rounded-lg bg-[#558476]/10 text-[#558476] hover:bg-[#558476]/20 border border-[#558476]/20 disabled:opacity-50 transition-colors"
                        >
                          Payout
                        </button>
                      </>
                    )}
                    {(a.status === "suspended" || a.status === "rejected") && (
                      <button disabled={loading === a.id} onClick={() => run(a.id, () => reactivateAffiliateAction(a.id))} className="rounded-lg border border-green-100 bg-green-50 px-2.5 py-1 text-xs text-green-700 hover:bg-green-100 disabled:opacity-50">Reactivate</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2.5 border-t border-slate-100 text-xs text-slate-400">
          Showing {affiliates.length} of {total} affiliates
        </div>
      </div>
      {reasonDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={() => setReasonDialog(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="affiliate-action-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl" onMouseDown={(event) => event.stopPropagation()}>
            <h3 id="affiliate-action-title" className="text-base font-semibold capitalize text-slate-900">{reasonDialog.kind} affiliate</h3>
            <p className="mt-1 text-sm text-slate-500">Record a reason for this status change.</p>
            <textarea
              autoFocus
              rows={4}
              value={reasonDialog.reason}
              onChange={(event) => setReasonDialog({ ...reasonDialog, reason: event.target.value })}
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#558476] focus:ring-2 focus:ring-[#558476]/15"
              placeholder="Enter reason"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setReasonDialog(null)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="button" disabled={!reasonDialog.reason.trim()} onClick={submitReason} className="rounded-lg bg-[#12291F] px-3 py-2 text-sm font-semibold text-white hover:bg-[#1c3b2e] disabled:cursor-not-allowed disabled:opacity-40">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
