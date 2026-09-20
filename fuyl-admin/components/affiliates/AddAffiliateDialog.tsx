"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { createAffiliateAction } from "@/app/(admin)/affiliates/actions";
import { Input, Select } from "@/components/ui/form";

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
    <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-[#558476] px-4 py-2 text-sm font-semibold text-white hover:bg-[#457366]"><Plus className="h-4 w-4" /> Add affiliate</button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={() => setOpen(false)}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="text-lg font-semibold">Add affiliate</h3><button onClick={() => setOpen(false)}><X className="h-5 w-5 text-slate-400" /></button></div>
        <form action={submit} className="mt-5 space-y-4">
          <Input label="Full name" required name="name" />
          <Input label="Email" required type="email" name="email" />
          <Input label="Phone" name="phone" />
          <Input label="Channels" name="channels" placeholder="Instagram, YouTube" helperText="Comma separated" />
          <Select label="Initial status" name="status" options={[{value:"pending",label:"Pending review"},{value:"approved",label:"Approved"}]} />
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-lg bg-[#558476] px-4 py-2 text-sm font-semibold text-white hover:bg-[#457366] disabled:opacity-50">{saving ? "Creating..." : "Create affiliate"}</button></div>
        </form>
      </div>
    </div>}
  </>;
}
