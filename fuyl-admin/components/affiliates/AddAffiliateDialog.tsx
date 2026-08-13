"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createAffiliateAction } from "@/app/(admin)/affiliates/actions";

export function AddAffiliateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setSaving(true); setError("");
    const result = await createAffiliateAction({
      name: String(formData.get("name") ?? ""), email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? "") || undefined,
      channels: String(formData.get("channels") ?? "").split(",").map((item) => item.trim()).filter(Boolean),
      status: formData.get("status") === "approved" ? "approved" : "pending",
    });
    setSaving(false);
    if (result.error) return setError(result.error);
    setOpen(false);
    router.push(`/affiliates/members/${result.id}`);
    router.refresh();
  }

  return <>
    <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#12291F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1c3b2e]"><Plus className="h-4 w-4" /> Add affiliate</button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={() => setOpen(false)}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Add affiliate</h3><button onClick={() => setOpen(false)}><X className="h-5 w-5 text-slate-400" /></button></div>
        <form action={submit} className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700">Full name<input required name="name" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-[#558476]" /></label>
          <label className="block text-sm font-medium text-slate-700">Email<input required type="email" name="email" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-[#558476]" /></label>
          <label className="block text-sm font-medium text-slate-700">Phone<input name="phone" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-[#558476]" /></label>
          <label className="block text-sm font-medium text-slate-700">Channels <span className="font-normal text-slate-400">(comma separated)</span><input name="channels" placeholder="Instagram, YouTube" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-[#558476]" /></label>
          <label className="block text-sm font-medium text-slate-700">Initial status<select name="status" className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2"><option value="pending">Pending review</option><option value="approved">Approved</option></select></label>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-lg bg-[#12291F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Creating…" : "Create affiliate"}</button></div>
        </form>
      </div>
    </div>}
  </>;
}
