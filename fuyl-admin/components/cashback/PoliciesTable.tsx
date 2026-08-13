"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ToggleLeft, ToggleRight, Trash2, Pencil, Tag } from "lucide-react";
import { CashbackPolicy } from "@/lib/cashback";
import { updatePolicyAction, deletePolicyAction } from "@/app/(admin)/discounts-cashback/cashback/actions";

interface Props {
  policies: CashbackPolicy[];
}

const MODE_COLORS: Record<string, string> = {
  standalone: "bg-blue-50 text-blue-700 border-blue-100",
  attached:   "bg-purple-50 text-purple-700 border-purple-100",
};

const TIMING_LABELS: Record<string, string> = {
  on_order:    "On order",
  on_delivery: "On delivery",
  after_days:  "After N days",
};

export function PoliciesTable({ policies: initial }: Props) {
  const [policies, setPolicies] = useState(initial);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function toggleActive(id: string, current: boolean) {
    startTransition(async () => {
      const result = await updatePolicyAction(id, { isActive: !current });
      if ("error" in result) {
        setError(result.error);
      } else {
        setPolicies((prev) => prev.map((p) => (p.id === id ? { ...p, isActive: !current } : p)));
      }
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deletePolicyAction(id);
      if ("error" in result) {
        setError(result.error);
      } else {
        setPolicies((prev) => prev.filter((p) => p.id !== id));
      }
    });
  }

  if (policies.length === 0) {
    return (
      <div className="text-center py-16 text-slate-400 text-sm bg-white rounded-xl border border-slate-100">
        No cashback policies yet. Create one to start rewarding customers.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-100 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Policy</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Mode</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Value</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Credit</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Budget</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {policies.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{p.name}</p>
                  {p.description && (
                    <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{p.description}</p>
                  )}
                  {p.couponCode && (
                    <span className="inline-flex items-center gap-1 mt-1 text-[11px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                      <Tag className="w-3 h-3" />
                      {p.couponCode}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full border capitalize ${MODE_COLORS[p.mode]}`}>
                    {p.mode}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {p.type === "percentage"
                    ? `${p.value}%${p.maxCap ? ` (max ₹${p.maxCap})` : ""}`
                    : `₹${p.value}`}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {TIMING_LABELS[p.creditTiming] ?? p.creditTiming}
                  {p.creditAfterDays ? ` (${p.creditAfterDays}d)` : ""}
                </td>
                <td className="px-4 py-3 text-right text-slate-700 tabular-nums">
                  {p.totalBudget > 0 ? (
                    <span>
                      <span className="text-slate-400">₹{p.usedBudget.toLocaleString()}</span>
                      {" / "}₹{p.totalBudget.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-xs">Unlimited</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleActive(p.id, p.isActive)}
                    disabled={pending}
                    className="text-slate-400 hover:text-[#558476] transition-colors disabled:opacity-50"
                  >
                    {p.isActive
                      ? <ToggleRight className="w-5 h-5 text-[#558476]" />
                      : <ToggleLeft className="w-5 h-5" />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/discounts-cashback/cashback/${p.id}/edit`}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => handleDelete(p.id, p.name)}
                      disabled={pending}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
