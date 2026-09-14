import { Info } from "lucide-react";

export function AffiliateInfoTip({ text }: { text: string }) {
  return <span title={text} aria-label={text} tabIndex={0} className="group relative inline-flex cursor-help align-middle outline-none">
    <Info className="h-4 w-4 text-sky-600" aria-hidden="true" />
    <span className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-64 -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-normal leading-relaxed text-white shadow-lg group-hover:block group-focus:block">{text}</span>
  </span>;
}
