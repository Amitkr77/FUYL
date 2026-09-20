"use client";
import { useState } from "react";
import type { Affiliate } from "@/lib/affiliate";
import { saveAffiliateReviewAction } from "@/app/(admin)/affiliates/actions";
import { Select, Textarea } from "@/components/ui/form";

const FRAUD_STATUS_OPTIONS = [
  { value: "clear", label: "Clear" },
  { value: "review", label: "Needs review" },
  { value: "blocked", label: "Blocked" },
];

export function AffiliateReviewCard({ affiliate }: { affiliate: Affiliate }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(data: FormData) {
    setSaving(true);
    const r = await saveAffiliateReviewAction(affiliate.id, {
      internalNote: String(data.get("internalNote") || ""),
      fraudStatus: String(data.get("fraudStatus")) as "clear" | "review" | "blocked",
      fraudNote: String(data.get("fraudNote") || ""),
    });
    setSaving(false);
    setMessage(r.error ?? "Review saved.");
  }

  return (
    <section className="rounded-xl border bg-white p-5">
      <h3 className="font-semibold">Internal review</h3>
      <form action={submit} className="mt-4 space-y-3">
        <Select
          label="Fraud status"
          name="fraudStatus"
          defaultValue={affiliate.metadata?.fraudReview?.status ?? "clear"}
          options={FRAUD_STATUS_OPTIONS}
        />
        <Textarea
          label="Fraud review note"
          name="fraudNote"
          defaultValue={affiliate.metadata?.fraudReview?.note}
          rows={2}
        />
        <Textarea
          label="Internal note"
          name="internalNote"
          defaultValue={affiliate.metadata?.internalNote}
          rows={3}
        />
        {message && <p className="text-xs text-slate-500">{message}</p>}
        <button
          disabled={saving}
          className="rounded-lg bg-[#558476] px-3 py-2 text-sm font-semibold text-white hover:bg-[#457366] disabled:opacity-50"
        >
          {saving ? "Saving\u2026" : "Save review"}
        </button>
      </form>
    </section>
  );
}
