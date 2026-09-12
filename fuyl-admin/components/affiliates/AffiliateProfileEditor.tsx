"use client";
import { useState } from "react";
import { Pencil, X } from "lucide-react";
import Link from "next/link";
import type { Affiliate, AffiliateProgram } from "@/lib/affiliate";
import { updateAffiliateAction } from "@/app/(admin)/affiliates/actions";

type AvailableCoupon = { code: string; discountName: string; status: string; isActive: boolean };

export function AffiliateProfileEditor({ affiliate, programs, coupons }: { affiliate: Affiliate; programs: AffiliateProgram[]; coupons: AvailableCoupon[] }) {
  const [editing, setEditing] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState("");
  const field = "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-[#558476]";
  async function submit(data: FormData) {
    setSaving(true); setError("");
    const result = await updateAffiliateAction(affiliate.id, {
      name: String(data.get("name") ?? ""), phone: String(data.get("phone") ?? ""), programId: String(data.get("programId") ?? ""),
      channels: String(data.get("channels") ?? "").split(",").map(v => v.trim()).filter(Boolean),
      couponCodes: data.getAll("couponCodes").map(String),
      paymentInfo: { upi: String(data.get("upi") ?? "") || undefined, accountName: String(data.get("accountName") ?? "") || undefined, bankAccount: String(data.get("bankAccount") ?? "") || undefined, ifsc: String(data.get("ifsc") ?? "") || undefined },
    });
    setSaving(false); if (result?.error) return setError(result.error); setEditing(false);
  }
  if (!editing) return <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1 text-sm font-medium text-[#315f52]"><Pencil className="h-3.5 w-3.5" /> Edit</button>;
  const selectedProgram = typeof affiliate.programId === "string" ? affiliate.programId : affiliate.programId._id;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onMouseDown={() => setEditing(false)}><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onMouseDown={e => e.stopPropagation()}><div className="flex justify-between"><h3 className="text-lg font-semibold">Edit affiliate</h3><button onClick={() => setEditing(false)} aria-label="Close"><X className="h-5 w-5" /></button></div><form action={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
    <label className="text-sm font-medium">Name<input required name="name" defaultValue={affiliate.name} className={field} /></label><label className="text-sm font-medium">Phone<input name="phone" defaultValue={affiliate.phone} className={field} /></label>
    <label className="text-sm font-medium sm:col-span-2">Affiliate program<select required name="programId" defaultValue={selectedProgram} className={field}>{programs.filter(p => p.isActive).map(p => <option key={p._id} value={p._id}>{p.name} — {p.defaultRate}%</option>)}</select><span className="mt-1 block text-xs font-normal text-slate-500">New orders use this program immediately; historical commissions keep their saved rate.</span></label>
    <label className="text-sm font-medium sm:col-span-2">Promotion channels<input name="channels" defaultValue={affiliate.channels.join(", ")} className={field} /></label>
    <fieldset className="sm:col-span-2"><legend className="text-sm font-medium">Affiliate coupons</legend><p className="mt-1 text-xs text-slate-500">Select coupons created in Discounts &amp; Cashback. A selected coupon applies its normal discount and attributes the order to this affiliate.</p><div className="mt-2 max-h-40 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-3">{coupons.length ? coupons.map(coupon => <label key={coupon.code} className="flex items-center justify-between gap-3 text-sm"><span className="flex items-center gap-2"><input type="checkbox" name="couponCodes" value={coupon.code} defaultChecked={(affiliate.couponCodes ?? []).includes(coupon.code)} /><strong>{coupon.code}</strong><span className="text-slate-500">{coupon.discountName}</span></span><span className={coupon.isActive && coupon.status === "active" ? "text-emerald-600" : "text-amber-600"}>{coupon.isActive && coupon.status === "active" ? "Active" : coupon.status}</span></label>) : <p className="text-sm text-slate-500">No coupons have been created yet.</p>}</div><Link href="/discounts-cashback/discounts/new" target="_blank" className="mt-2 inline-block text-xs font-semibold text-[#315f52] hover:underline">Create a new affiliate-named coupon →</Link></fieldset>
    <label className="text-sm font-medium">UPI ID<input name="upi" defaultValue={affiliate.paymentInfo?.upi} className={field} /></label><label className="text-sm font-medium">Account holder<input name="accountName" defaultValue={affiliate.paymentInfo?.accountName} className={field} /></label><label className="text-sm font-medium">Bank account<input name="bankAccount" defaultValue={affiliate.paymentInfo?.bankAccount} className={field} /></label><label className="text-sm font-medium">IFSC<input name="ifsc" defaultValue={affiliate.paymentInfo?.ifsc} className={field} /></label>
    {error && <p className="sm:col-span-2 rounded-lg bg-red-50 p-2 text-sm text-red-600">{error}</p>}<div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={() => setEditing(false)} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-lg bg-[#12291F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save changes"}</button></div>
  </form></div></div>;
}
