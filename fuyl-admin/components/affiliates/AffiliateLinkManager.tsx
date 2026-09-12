"use client";
import { useState } from "react";
import type { AffiliateLink } from "@/lib/affiliate";
import { createAffiliateLinkAction, toggleAffiliateLinkAction } from "@/app/(admin)/affiliates/actions";

export function AffiliateLinkManager({ affiliateId, links }: { affiliateId: string; links: AffiliateLink[] }) {
  const [adding, setAdding] = useState(false), [message, setMessage] = useState("");
  async function create(data: FormData) {
    const result = await createAffiliateLinkAction(affiliateId, { label: String(data.get("label") || ""), destination: String(data.get("destination") || "/"), code: String(data.get("code") || "") || undefined });
    setMessage(result.error ?? "Tracking link created."); if (!result.error) setAdding(false);
  }
  return <section className="rounded-xl border bg-white p-5"><div className="flex justify-between"><h3 className="font-semibold">Manage tracking links</h3><button onClick={() => setAdding(v => !v)} className="text-sm font-medium text-[#315f52]">{adding ? "Cancel" : "Add link"}</button></div>
    {adding && <form action={create} className="mt-4 grid gap-2"><input required name="label" placeholder="Label, e.g. Instagram bio" className="rounded-lg border px-3 py-2 text-sm"/><div><input name="code" minLength={3} maxLength={30} pattern="[A-Za-z0-9_-]+" placeholder="Custom URL name, e.g. AMIT" className="w-full rounded-lg border px-3 py-2 text-sm"/><p className="mt-1 text-xs text-slate-500">Optional. Creates fuyl.in/r/AMIT; leave blank for an automatic code.</p></div><input required name="destination" defaultValue="/" placeholder="Destination path" className="rounded-lg border px-3 py-2 text-sm"/><button className="rounded-lg bg-[#12291F] px-3 py-2 text-sm font-semibold text-white">Create link</button></form>}
    {message && <p className="mt-2 text-xs text-slate-500">{message}</p>}<div className="mt-4 space-y-2">{links.map(link => <div key={link._id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3"><div className="min-w-0"><p className="text-sm font-medium">{link.label || link.code}</p><p className="truncate text-xs text-slate-400">/r/{link.code} → {link.destination}</p></div><button onClick={async () => { const result = await toggleAffiliateLinkAction(affiliateId, link._id, !link.isActive); setMessage(result.error ?? `Link ${link.isActive ? "disabled" : "enabled"}.`); }} className={`rounded-full px-2 py-1 text-xs ${link.isActive ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"}`}>{link.isActive ? "Active" : "Inactive"}</button></div>)}</div>
  </section>;
}
