"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowRightLeft, Table2, BarChart3 } from "lucide-react";
import type { AssessmentResult, NutrientRow } from "@/engine";
import { AMOUNT, COVERAGE, GLOBAL, INDIA, TRACK } from "./palette";

/**
 * Vitamins & minerals: one serve vs what a person needs a day — in India
 * (ICMR-NIN 2020) and globally (US NIH). Each nutrient is a bullet bar: the
 * bar is what one serve gives; two markers show India's and the global daily
 * requirement on the same scale. Switch Women / Men / Both; filter vitamins
 * or minerals; or read it as a table.
 */

type Sex = "female" | "male";
type View = "female" | "male" | "both";

const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString("en-IN") : n.toLocaleString("en-IN", { maximumFractionDigits: 1 }));
const pct = (amount: number, need: number) => (need > 0 ? Math.round((amount / need) * 100) : 0);
const short = (name: string) => name.replace(/\s*\(.*\)$/, "");

function needs(r: NutrientRow, sex: Sex | "max") {
  if (!r.ref) return { india: r.india, global: r.global };
  const pick = (v: { male: number; female: number }) => (sex === "max" ? Math.max(v.male, v.female) : v[sex]);
  return { india: pick(r.ref.india), global: pick(r.ref.global) };
}

const BINS = [
  { min: 100, label: "Fully covered", note: "100%+" },
  { min: 50, label: "More than half", note: "50–99%" },
  { min: 25, label: "A good part", note: "25–49%" },
  { min: 0, label: "A small top-up", note: "under 25%" },
] as const;

function Bullet({ r, sex, label }: { r: NutrientRow; sex: Sex | "max"; label?: string }) {
  const { india, global } = needs(r, sex);
  const scale = Math.max(r.amount, india, global) * 1.08;
  const at = (v: number) => `${(v / scale) * 100}%`;
  const ip = pct(r.amount, india);
  const gp = pct(r.amount, global);
  return (
    <div>
      {label && <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{label}</p>}
      <div className="relative h-4" role="img" aria-label={`${r.name}: one serve ${fmt(r.amount)} ${r.unit}. India needs ${fmt(india)} ${r.unit} (${ip}%), global ${fmt(global)} ${r.unit} (${gp}%).`}>
        <div className="absolute inset-y-1 left-0 right-0 rounded-full" style={{ background: TRACK }} />
        <div className="bar-grow absolute inset-y-1 left-0 rounded-full" style={{ width: at(r.amount), background: AMOUNT }} title={`One serve: ${fmt(r.amount)} ${r.unit}`} />
        {/* Markers: 2px surface ring so they read on top of the bar. */}
        <span className="absolute top-0 h-4 w-[5px] -translate-x-1/2 rounded-sm ring-2 ring-white" style={{ left: at(india), background: INDIA }} title={`India needs ${fmt(india)} ${r.unit}/day — one serve covers ${ip}%`} />
        <span className="absolute top-0 h-4 w-[5px] -translate-x-1/2 rounded-sm ring-2 ring-white" style={{ left: at(global), background: GLOBAL }} title={`Global need ${fmt(global)} ${r.unit}/day — one serve covers ${gp}%`} />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: INDIA }} aria-hidden />
          India {fmt(india)} {r.unit} · <strong className="font-medium text-forest tabular-nums">{ip}%</strong>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: GLOBAL }} aria-hidden />
          Global {fmt(global)} {r.unit} · <strong className="font-medium text-forest tabular-nums">{gp}%</strong>
        </span>
      </div>
    </div>
  );
}

function Seg<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-white/70 p-1 shadow-[inset_0_0_0_1px_rgba(18,41,31,0.08)]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx("rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors", value === o.value ? "bg-forest text-white" : "text-forest hover:bg-sage/60")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function NutrientExplorer({ nutrients }: { nutrients: NonNullable<AssessmentResult["nutrients"]> }) {
  const hasRef = nutrients.rows.every((r) => r.ref);
  const [view, setView] = useState<View>(nutrients.basis === "adult" || !hasRef ? (hasRef ? "both" : "female") : nutrients.basis);
  const [kind, setKind] = useState<"all" | "vitamin" | "mineral">("all");
  const [asTable, setAsTable] = useState(false);

  const rows = nutrients.rows.filter((r) => kind === "all" || r.kind === kind);
  const sexFor = (v: View): Sex | "max" => (v === "both" ? "max" : v);

  // Coverage groups for the selected requirement (Both → the higher, stricter value).
  const bins = useMemo(() => {
    const counts = BINS.map(() => 0);
    for (const r of nutrients.rows) {
      const p = pct(r.amount, needs(r, sexFor(view)).india);
      counts[BINS.findIndex((b) => p >= b.min)]++;
    }
    return counts;
  }, [nutrients.rows, view]);

  // Where India and global guidelines differ the most (≥25%), for the selected sex.
  const diffs = useMemo(() => {
    const sexes: Sex[] = view === "both" ? ["female", "male"] : [view];
    return sexes.map((sex) => {
      const scored = nutrients.rows
        .filter((r) => r.ref)
        .map((r) => ({ r, india: r.ref!.india[sex], global: r.ref!.global[sex] }))
        .map((x) => ({ ...x, ratio: x.india / x.global }));
      const more = scored.filter((x) => x.ratio >= 1.25).sort((a, b) => b.ratio - a.ratio).slice(0, 3);
      const less = scored.filter((x) => x.ratio <= 0.8).sort((a, b) => a.ratio - b.ratio).slice(0, 3);
      return { sex, more, less };
    });
  }, [nutrients.rows, view]);

  const total = nutrients.rows.length;
  const describe = (xs: { r: NutrientRow; india: number; global: number }[]) =>
    xs.map((x) => `${short(x.r.name)} (${fmt(x.india)} vs ${fmt(x.global)} ${x.r.unit})`).join(", ");

  return (
    <section aria-labelledby="nutrients-heading" className="glass-strong rounded-[var(--radius-glass)] p-6 sm:p-9">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-deep">Vitamins &amp; minerals</p>
      <h2 id="nutrients-heading" className="mt-3 font-display text-2xl text-forest sm:text-3xl">
        One serve vs what you need a day
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Daily requirements differ between India and global guidelines — and between women and men. Here&rsquo;s how one 10 g serve of COMPLETE+ measures up to both.
      </p>

      {/* Controls in one row above the chart. */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {hasRef && (
          <Seg
            label="Show requirements for"
            value={view}
            onChange={setView}
            options={[
              { value: "female", label: "Women" },
              { value: "male", label: "Men" },
              { value: "both", label: "Both" },
            ]}
          />
        )}
        <Seg
          label="Nutrients"
          value={kind}
          onChange={setKind}
          options={[
            { value: "all", label: `All ${total}` },
            { value: "vitamin", label: "Vitamins" },
            { value: "mineral", label: "Minerals" },
          ]}
        />
        <button
          type="button"
          onClick={() => setAsTable((t) => !t)}
          aria-pressed={asTable}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-teal-deep hover:bg-sage/50"
        >
          {asTable ? <BarChart3 className="h-3.5 w-3.5" aria-hidden /> : <Table2 className="h-3.5 w-3.5" aria-hidden />}
          {asTable ? "Show chart" : "Show as table"}
        </button>
      </div>

      {/* Coverage at a glance: one segmented bar (part-to-whole). */}
      <div className="mt-6 rounded-2xl bg-white/55 p-4 sm:p-5">
        <p className="text-sm font-medium text-forest">
          How much of India&rsquo;s daily need one serve covers{view === "both" ? " (using the higher of men's and women's needs)" : ""}
        </p>
        <div className="mt-3 flex h-3.5 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label={BINS.map((b, i) => `${b.label}: ${bins[i]}`).join(", ")}>
          {BINS.map((b, i) =>
            bins[i] ? <span key={b.label} className="h-full first:rounded-l-full last:rounded-r-full" style={{ flexGrow: bins[i], background: COVERAGE[3 - i] }} title={`${b.label}: ${bins[i]} of ${total}`} /> : null,
          )}
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted sm:grid-cols-4">
          {BINS.map((b, i) => (
            <li key={b.label} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: COVERAGE[3 - i] }} aria-hidden />
              <span>
                <strong className="font-semibold text-forest tabular-nums">{bins[i]}</strong> {b.label.toLowerCase()} <span className="text-muted/80">({b.note})</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* India vs global: where the guidelines differ most. */}
      {hasRef && diffs.some((d) => d.more.length || d.less.length) && (
        <div className="mt-4 rounded-2xl border border-line/70 bg-white/40 p-4 text-sm leading-relaxed text-forest sm:p-5">
          <p className="flex items-center gap-2 font-medium">
            <ArrowRightLeft className="h-4 w-4 text-teal-deep" aria-hidden /> India vs global — where they differ
          </p>
          {diffs.map((d) => (
            <div key={d.sex} className="mt-2">
              {view === "both" && <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">{d.sex === "female" ? "Women" : "Men"}</p>}
              {d.more.length > 0 && (
                <p className="mt-1">
                  <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: INDIA }} aria-hidden />
                  India recommends more: {describe(d.more)}.
                </p>
              )}
              {d.less.length > 0 && (
                <p className="mt-1">
                  <span className="mr-1 inline-block h-2 w-2 rounded-full align-middle" style={{ background: GLOBAL }} aria-hidden />
                  Global guidelines ask for more: {describe(d.less)}.
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Legend (≥ 2 series) */}
      <div className="mt-6 flex flex-wrap gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-full" style={{ background: AMOUNT }} aria-hidden /> One serve of COMPLETE+
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-[5px] rounded-sm" style={{ background: INDIA }} aria-hidden /> India daily need (ICMR-NIN 2020)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-[5px] rounded-sm" style={{ background: GLOBAL }} aria-hidden /> Global daily need (US NIH)
        </span>
      </div>

      {asTable ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-line/60">
                <th scope="col" className="py-2 pr-3 font-medium">Nutrient</th>
                <th scope="col" className="py-2 pr-3 font-medium">Per serve</th>
                {(view === "both" ? (["female", "male"] as Sex[]) : [view as Sex]).flatMap((s) => [
                  <th key={`${s}i`} scope="col" className="py-2 pr-3 font-medium">India{view === "both" ? ` (${s === "female" ? "W" : "M"})` : ""}</th>,
                  <th key={`${s}g`} scope="col" className="py-2 pr-3 font-medium">Global{view === "both" ? ` (${s === "female" ? "W" : "M"})` : ""}</th>,
                ])}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-line/40 last:border-0">
                  <th scope="row" className="py-2 pr-3 font-medium text-forest">{r.name}</th>
                  <td className="whitespace-nowrap py-2 pr-3 tabular-nums">{fmt(r.amount)} {r.unit}</td>
                  {(view === "both" ? (["female", "male"] as Sex[]) : [view as Sex]).flatMap((s) => {
                    const n = needs(r, s);
                    return [
                      <td key={`${s}i`} className="whitespace-nowrap py-2 pr-3 tabular-nums text-muted">{fmt(n.india)} {r.unit} <span className="text-forest">({pct(r.amount, n.india)}%)</span></td>,
                      <td key={`${s}g`} className="whitespace-nowrap py-2 pr-3 tabular-nums text-muted">{fmt(n.global)} {r.unit} <span className="text-forest">({pct(r.amount, n.global)}%)</span></td>,
                    ];
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-line/40">
          {rows.map((r) => (
            <li key={r.key} className="grid gap-2 py-3.5 transition-colors hover:bg-white/40 sm:grid-cols-[11rem_1fr] sm:gap-5 sm:px-2">
              <div>
                <p className="text-sm font-medium text-forest">{r.name}</p>
                <p className="text-xs tabular-nums text-muted">
                  {fmt(r.amount)} {r.unit} per serve
                </p>
              </div>
              {view === "both" && hasRef ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Bullet r={r} sex="female" label="Women" />
                  <Bullet r={r} sex="male" label="Men" />
                </div>
              ) : (
                <Bullet r={r} sex={sexFor(view)} />
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-5 text-xs leading-relaxed text-muted">
        India: ICMR-NIN &ldquo;Nutrient Requirements for Indians&rdquo; (2020), adults. Global: US National Institutes of Health RDA/AI, adults 19–50.
        A supplement adds to what you get from food — it isn&rsquo;t meant to cover 100% on its own.
      </p>
    </section>
  );
}
