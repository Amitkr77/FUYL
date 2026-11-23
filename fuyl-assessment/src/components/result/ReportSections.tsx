import { CheckCircle2, FlaskConical, Leaf, ShieldCheck, Sparkles, Target } from "lucide-react";
import type { AssessmentResult, Finding, NutrientRow } from "@/engine";

/** Report sections added on top of the original layout: the summary of findings and the India-vs-global nutrient table. */

const FINDING_ICON: Record<Finding["kind"], typeof Target> = {
  focus: Target,
  safety: ShieldCheck,
  nutrition: FlaskConical,
  ingredients: Leaf,
};

export function FindingsCard({ findings }: { findings: NonNullable<AssessmentResult["findings"]> }) {
  return (
    <section aria-labelledby="findings-heading" className="glass-strong rounded-[var(--radius-glass)] p-6 sm:p-9">
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-teal-deep">
        <Sparkles className="h-3.5 w-3.5" aria-hidden /> Summary of your findings
      </p>
      <h2 id="findings-heading" className="mt-3 text-balance font-display text-2xl leading-snug text-forest sm:text-3xl">
        {findings.headline}
      </h2>
      <ul className="mt-6 space-y-3">
        {findings.points.map((p) => {
          const Icon = FINDING_ICON[p.kind] ?? CheckCircle2;
          return (
            <li key={p.text} className="flex gap-3 text-[15px] leading-relaxed text-forest">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage/70">
                <Icon className="h-3.5 w-3.5 text-forest" aria-hidden />
              </span>
              <span>{p.text}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

const BASIS_LABEL = {
  male: "Daily needs shown for adult men.",
  female: "Daily needs shown for adult women.",
  adult: "Daily needs shown as the higher of the men's and women's values.",
} as const;

const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString("en-IN") : n.toLocaleString("en-IN", { maximumFractionDigits: 1 }));

function Meter({ pct, tone, label }: { pct: number; tone: "india" | "global"; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-1.5 w-full min-w-16 overflow-hidden rounded-full bg-forest/10"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.min(100, pct)}
      >
        <div className={`h-full rounded-full ${tone === "india" ? "bg-teal-deep" : "bg-ember"}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="w-11 shrink-0 text-right text-xs tabular-nums text-forest">{pct}%</span>
    </div>
  );
}

/** Per serve vs daily needs in India (ICMR-NIN 2020) and globally (US NIH). */
export function NutrientComparison({ nutrients }: { nutrients: NonNullable<AssessmentResult["nutrients"]> }) {
  const rows = nutrients.rows;
  return (
    <section aria-labelledby="nutrients-heading" className="glass-strong rounded-[var(--radius-glass)] p-6 sm:p-9">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-deep">Vitamins &amp; minerals</p>
      <h2 id="nutrients-heading" className="mt-3 font-display text-2xl text-forest sm:text-3xl">
        One serve vs what you need a day
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        How much of each daily requirement one 10 g serve of COMPLETE+ provides — in India and globally. {BASIS_LABEL[nutrients.basis]}
      </p>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-teal-deep" aria-hidden /> India · ICMR-NIN 2020
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-ember" aria-hidden /> Global · US NIH
        </span>
      </div>

      {/* Desktop: table */}
      <div className="mt-6 hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted">
            <tr className="border-b border-line/60">
              <th scope="col" className="py-2 pr-3 font-medium">Nutrient</th>
              <th scope="col" className="py-2 pr-3 font-medium">Per serve</th>
              <th scope="col" className="py-2 pr-3 font-medium">India needs / day</th>
              <th scope="col" className="w-36 py-2 pr-3 font-medium">
                <span className="sr-only">India </span>Covered
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">Global needs / day</th>
              <th scope="col" className="w-36 py-2 font-medium">
                <span className="sr-only">Global </span>Covered
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-line/40 last:border-0">
                <th scope="row" className="py-2.5 pr-3 font-medium text-forest">{r.name}</th>
                <td className="whitespace-nowrap py-2.5 pr-3 tabular-nums text-forest">{fmt(r.amount)} {r.unit}</td>
                <td className="whitespace-nowrap py-2.5 pr-3 tabular-nums text-muted">{fmt(r.india)} {r.unit}</td>
                <td className="py-2.5 pr-3">
                  <Meter pct={r.indiaPct} tone="india" label={`${r.name}: share of India's daily requirement`} />
                </td>
                <td className="whitespace-nowrap py-2.5 pr-3 tabular-nums text-muted">{fmt(r.global)} {r.unit}</td>
                <td className="py-2.5">
                  <Meter pct={r.globalPct} tone="global" label={`${r.name}: share of the global daily requirement`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="mt-6 space-y-3 sm:hidden">
        {rows.map((r) => (
          <li key={r.key} className="rounded-2xl bg-white/60 p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-forest">{r.name}</p>
              <p className="text-xs tabular-nums text-teal-deep">
                {fmt(r.amount)} {r.unit} per serve
              </p>
            </div>
            <div className="mt-3 grid gap-2 text-xs text-muted">
              <div>
                <p className="mb-1">India needs {fmt(r.india)} {r.unit}</p>
                <Meter pct={r.indiaPct} tone="india" label={`${r.name}: share of India's daily requirement`} />
              </div>
              <div>
                <p className="mb-1">Global needs {fmt(r.global)} {r.unit}</p>
                <Meter pct={r.globalPct} tone="global" label={`${r.name}: share of the global daily requirement`} />
              </div>
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-5 text-xs leading-relaxed text-muted">
        India: ICMR-NIN “Nutrient Requirements for Indians” (2020), adults. Global: US National Institutes of Health RDA/AI, adults 19–50.
        A supplement adds to what you get from food — it isn&rsquo;t meant to cover 100% on its own.
      </p>
    </section>
  );
}

/** Short "% of daily need" text for an ingredient tile, from the comparison rows. */
export function nutrientNote(rows: NutrientRow[] | undefined, key: string): string | null {
  const r = rows?.find((x) => x.key === key);
  return r ? `${r.indiaPct}% India · ${r.globalPct}% global daily need` : null;
}
