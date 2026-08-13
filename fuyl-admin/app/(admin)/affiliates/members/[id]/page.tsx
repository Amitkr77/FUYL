import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Banknote, ExternalLink, Mail, MousePointerClick, ShoppingBag, UserRound } from "lucide-react";
import { getAffiliate } from "@/lib/affiliate";
import { AdminApiError } from "@/lib/api";
import { AffiliateProfileEditor } from "@/components/affiliates/AffiliateProfileEditor";
import { AffiliateReviewCard } from "@/components/affiliates/AffiliateReviewCard";
import { AffiliateLinkManager } from "@/components/affiliates/AffiliateLinkManager";

function money(value: number) { return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`; }
function programName(program: Awaited<ReturnType<typeof getAffiliate>>["affiliate"]["programId"]) { return typeof program === "string" ? program : program.name; }

export default async function AffiliateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let data: Awaited<ReturnType<typeof getAffiliate>>;
  try { data = await getAffiliate(id); } catch (error) { if (error instanceof AdminApiError && error.status === 404) notFound(); throw error; }
  const { affiliate, links, commissions, payouts } = data;
  const totals = commissions.reduce<Record<string, number>>((sum, item) => ({ ...sum, [item.status]: (sum[item.status] ?? 0) + item.amount }), {});

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><Link href="/affiliates/members" className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-slate-900"><ArrowLeft className="h-4 w-4" /></Link><div><h2 className="text-xl font-bold text-slate-900">{affiliate.name}</h2><p className="text-sm text-slate-500">Joined {new Date(affiliate.createdAt).toLocaleDateString("en-IN")}</p></div></div>
      <div className="flex items-center gap-3"><AffiliateProfileEditor affiliate={affiliate} /><span className="rounded-full bg-[#558476]/10 px-3 py-1.5 text-sm font-semibold capitalize text-[#315f52]">{affiliate.status}</span></div>
    </div>

    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[["Pending", totals.pending ?? 0], ["Approved", (totals.approved ?? 0) + (totals.payable ?? 0)], ["Paid", totals.paid ?? 0], ["Revenue", affiliate.stats.totalRevenue]].map(([label, value]) => <div key={String(label)} className="rounded-xl border border-slate-100 bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold">{money(Number(value))}</p></div>)}
    </div>

    <div className="grid gap-5 lg:grid-cols-2">
      <AffiliateLinkManager affiliateId={affiliate.id} links={links} />
      <AffiliateReviewCard affiliate={affiliate} />
    </div>

    <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="space-y-5">
        <section className="rounded-xl border border-slate-100 bg-white p-5"><h3 className="font-semibold">Tracking links</h3>{links.length ? <div className="mt-4 space-y-3">{links.map(link => <div key={link._id} className="rounded-lg border border-slate-200 p-3"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-medium">{link.label || "Affiliate link"}</p><p className="mt-1 break-all text-xs text-slate-500">{link.trackingUrl}</p></div><a href={link.trackingUrl} target="_blank" rel="noreferrer" className="text-[#315f52]"><ExternalLink className="h-4 w-4" /></a></div><p className="mt-2 text-xs text-slate-400">Destination: {link.destination} · Code: {link.code}</p></div>)}</div> : <p className="mt-4 text-sm text-slate-400">No tracking links.</p>}</section>
        <section className="rounded-xl border border-slate-100 bg-white"><div className="border-b px-5 py-4"><h3 className="font-semibold">Commission history</h3></div>{commissions.length ? <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase text-slate-400"><th className="px-5 py-3">Date</th><th className="px-5 py-3">Base</th><th className="px-5 py-3">Rate</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th></tr></thead><tbody>{commissions.slice(0,10).map(c => <tr key={c.id} className="border-b last:border-0"><td className="px-5 py-3">{new Date(c.createdAt).toLocaleDateString("en-IN")}</td><td className="px-5 py-3">{money(c.baseAmount)}</td><td className="px-5 py-3">{c.snapshotRate}%</td><td className="px-5 py-3 font-semibold">{money(c.amount)}</td><td className="px-5 py-3 capitalize">{c.status}</td></tr>)}</tbody></table></div> : <p className="p-8 text-center text-sm text-slate-400">No commissions yet.</p>}</section>
      </div>
      <div className="space-y-5">
        <section className="rounded-xl border border-slate-100 bg-white p-5"><h3 className="font-semibold">General information</h3><dl className="mt-4 space-y-4 text-sm"><div><dt className="text-slate-400">Email</dt><dd className="mt-1 flex items-center gap-2 font-medium"><Mail className="h-4 w-4" />{affiliate.email}</dd></div><div><dt className="text-slate-400">Phone</dt><dd className="mt-1 font-medium">{affiliate.phone || "Not provided"}</dd></div><div><dt className="text-slate-400">Program</dt><dd className="mt-1 font-medium">{programName(affiliate.programId)}</dd></div><div><dt className="text-slate-400">Channels</dt><dd className="mt-1 font-medium">{affiliate.channels.join(", ") || "None"}</dd></div></dl></section>
        <section className="rounded-xl border border-slate-100 bg-white p-5"><h3 className="font-semibold">Performance</h3><div className="mt-4 grid grid-cols-2 gap-3">{[[MousePointerClick,"Clicks",affiliate.stats.totalClicks],[ShoppingBag,"Orders",affiliate.stats.totalOrders],[Banknote,"Earned",money(affiliate.stats.totalCommissionEarned)],[UserRound,"Payouts",payouts.length]].map(([Icon,label,value]) => { const C=Icon as typeof MousePointerClick; return <div key={String(label)} className="rounded-lg bg-slate-50 p-3"><C className="h-4 w-4 text-[#558476]"/><p className="mt-2 text-xs text-slate-400">{String(label)}</p><p className="font-semibold">{String(value)}</p></div>})}</div></section>
      </div>
    </div>
  </div>;
}
