import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

export function AffiliateSectionPlaceholder({ icon: Icon, title, description, available }: { icon: LucideIcon; title: string; description: string; available: string[] }) {
  return (
    <section className="rounded-2xl border border-slate-100 bg-white p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#558476]/10 text-[#315f52]"><Icon className="h-5 w-5" /></div>
      <h2 className="mt-4 text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Planned capabilities</p>
        <ul className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">{available.map((item) => <li key={item}>• {item}</li>)}</ul>
      </div>
      <Link href="/affiliates" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-[#315f52] hover:text-[#12291F]">Back to overview <ArrowRight className="h-4 w-4" /></Link>
    </section>
  );
}
