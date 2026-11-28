"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowRightLeft, Table2, BarChart3, ShieldCheck, Utensils } from "lucide-react";
import { AGE_GROUPS, refForAge, type AgeGroup, type AssessmentResult, type NutrientRow } from "@/engine";
import { AMOUNT, COVERAGE, DIET, GLOBAL, INDIA, SERVE, TRACK } from "./palette";

/**
 * Vitamins & minerals: one serve vs what a person needs a day — in India
 * (ICMR-NIN 2020) and globally (US NIH). Each nutrient is a bullet bar: the
 * bar is what one serve gives; two markers show India's and the global daily
 * requirement on the same scale. Switch Women / Men / Both; filter vitamins
 * or minerals; or read it as a table.
 */

type Sex = "female" | "male";
type View = "female" | "male" | "both";
type Guideline = "india" | "global";

const fmt = (n: number) => (Number.isInteger(n) ? n.toLocaleString("en-IN") : n.toLocaleString("en-IN", { maximumFractionDigits: 1 }));
const pct = (amount: number, need: number) => (need > 0 ? Math.round((amount / need) * 100) : 0);
const short = (name: string) => name.replace(/\s*\(.*\)$/, "");

function needs(r: NutrientRow, sex: Sex | "max") {
  if (!r.ref) return { india: r.india, global: r.global };
  const pick = (v: { male: number; female: number }) => (sex === "max" ? Math.max(v.male, v.female) : v[sex]);
  return { india: pick(r.ref.india), global: pick(r.ref.global) };
}

/** What counts toward a nutrient's upper limit: one serve, plus meals when the limit covers all sources. */
function towardLimit(r: NutrientRow, withDiet: boolean) {
  if (!r.upper) return 0;
  return r.amount + (r.upper.from === "total" && withDiet ? (r.diet ?? 0) : 0);
}

const BINS = [
  { min: 100, label: "Fully covered", note: "100%+" },
  { min: 50, label: "More than half", note: "50–99%" },
  { min: 25, label: "A good part", note: "25–49%" },
  { min: 0, label: "A small top-up", note: "under 25%" },
] as const;

function Bullet({
  r,
  sex,
  label,
  showGlobal = true,
  primary = "india",
}: {
  r: NutrientRow;
  sex: Sex | "max";
  label?: string;
  showGlobal?: boolean;
  primary?: Guideline;
}) {
  if (!showGlobal && primary === "global") return <SingleBullet r={r} sex={sex} />;
  const { india, global } = needs(r, sex);
  const scale = Math.max(r.amount, india, showGlobal ? global : 0) * 1.08;
  const at = (v: number) => `${(v / scale) * 100}%`;
  const ip = pct(r.amount, india);
  const gp = pct(r.amount, global);
  return (
    <div>
      {label && <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{label}</p>}
      <div className="relative h-4" role="img" aria-label={`${r.name}: one serve ${fmt(r.amount)} ${r.unit}. India needs ${fmt(india)} ${r.unit} (${ip}%)${showGlobal ? `, global ${fmt(global)} ${r.unit} (${gp}%)` : ""}.`}>
        <div className="absolute inset-y-1 left-0 right-0 rounded-full" style={{ background: TRACK }} />
        <div className="bar-grow absolute inset-y-1 left-0 rounded-full" style={{ width: at(r.amount), background: AMOUNT }} title={`One serve: ${fmt(r.amount)} ${r.unit}`} />
        {/* Markers: 2px surface ring so they read on top of the bar. */}
        <span className="absolute top-0 h-4 w-[5px] -translate-x-1/2 rounded-sm ring-2 ring-white" style={{ left: at(india), background: INDIA }} title={`India needs ${fmt(india)} ${r.unit}/day — one serve covers ${ip}%`} />
        {showGlobal && (
          <span className="absolute top-0 h-4 w-[5px] -translate-x-1/2 rounded-sm ring-2 ring-white" style={{ left: at(global), background: GLOBAL }} title={`Global need ${fmt(global)} ${r.unit}/day — one serve covers ${gp}%`} />
        )}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: INDIA }} aria-hidden />
          {showGlobal ? "India" : "You need"} {fmt(india)} {r.unit} a day · <strong className="font-medium text-forest tabular-nums">{ip}% covered</strong>
        </span>
        {showGlobal && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: GLOBAL }} aria-hidden />
            Global {fmt(global)} {r.unit} · <strong className="font-medium text-forest tabular-nums">{gp}%</strong>
          </span>
        )}
      </div>
    </div>
  );
}

/** Not comparing, outside India: one serve vs the global daily need only. */
function SingleBullet({ r, sex }: { r: NutrientRow; sex: Sex | "max" }) {
  const need = needs(r, sex).global;
  const scale = Math.max(r.amount, need) * 1.08;
  const at = (v: number) => `${(v / scale) * 100}%`;
  const p = pct(r.amount, need);
  return (
    <div>
      <div className="relative h-4" role="img" aria-label={`${r.name}: one serve ${fmt(r.amount)} ${r.unit}; you need ${fmt(need)} ${r.unit} a day (${p}%).`}>
        <div className="absolute inset-y-1 left-0 right-0 rounded-full" style={{ background: TRACK }} />
        <div className="bar-grow absolute inset-y-1 left-0 rounded-full" style={{ width: at(r.amount), background: AMOUNT }} title={`One serve: ${fmt(r.amount)} ${r.unit}`} />
        <span className="absolute top-0 h-4 w-[5px] -translate-x-1/2 rounded-sm ring-2 ring-white" style={{ left: at(need), background: GLOBAL }} title={`You need ${fmt(need)} ${r.unit}/day — one serve covers ${p}%`} />
      </div>
      <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-muted">
        <span className="h-2 w-2 rounded-full" style={{ background: GLOBAL }} aria-hidden />
        You need {fmt(need)} {r.unit} a day · <strong className="font-medium text-forest tabular-nums">{p}% covered</strong>
      </p>
    </div>
  );
}

/**
 * Diet gap: your meals (estimated) + one serve, stacked, in % of the daily
 * need; the marker sits at 100%. Whatever's left after both is the gap.
 */
function DietBar({ r, sex, primary }: { r: NutrientRow; sex: Sex | "max"; primary: Guideline }) {
  const need = primary === "global" ? needs(r, sex).global : needs(r, sex).india;
  const dietPct = pct(r.diet ?? 0, need);
  const servePct = pct(r.amount, need);
  const total = dietPct + servePct;
  const gap = Math.max(0, 100 - total);
  const scale = Math.min(200, Math.max(100, total)) * 1.05;
  const w = (v: number) => `${(Math.min(v, scale) / scale) * 100}%`;
  const dietW = Math.min(dietPct, scale);
  const serveW = Math.max(0, Math.min(servePct, scale - dietW));
  return (
    <div>
      <div
        className="relative h-4"
        role="img"
        aria-label={`${r.name}: your meals give about ${dietPct}% of the ${fmt(need)} ${r.unit} you need a day; one serve adds ${servePct}%; ${gap ? `about ${gap}% still to get` : "together that covers your daily need"}.`}
      >
        <div className="absolute inset-y-1 left-0 right-0 rounded-full" style={{ background: TRACK }} />
        <div className="absolute inset-y-1 left-0 flex gap-[2px]" style={{ width: w(dietW + serveW) }}>
          {dietW > 0 && (
            <span className="bar-grow h-full rounded-l-full" style={{ flexGrow: dietW, background: DIET, borderRadius: serveW ? undefined : 9999 }} title={`Your meals: about ${dietPct}%`} />
          )}
          {serveW > 0 && (
            <span className="bar-grow h-full rounded-r-full" style={{ flexGrow: serveW, background: SERVE, borderRadius: dietW ? undefined : 9999 }} title={`One serve: +${servePct}%`} />
          )}
        </div>
        <span className="absolute top-0 h-4 w-[5px] -translate-x-1/2 rounded-sm ring-2 ring-white" style={{ left: w(100), background: INDIA }} title={`Daily need: ${fmt(need)} ${r.unit}`} />
      </div>
      <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
        <span>
          Meals ≈ <strong className="font-medium text-forest tabular-nums">{dietPct}%</strong>
        </span>
        <span>
          One serve <strong className="font-medium text-forest tabular-nums">+{servePct}%</strong>
        </span>
        <span>
          {gap ? (
            <>
              Still to get <strong className="font-medium text-forest tabular-nums">{gap}%</strong>
            </>
          ) : (
            <strong className="font-medium text-forest">Daily need covered</strong>
          )}
        </span>
        <span className="text-muted/80">
          of {fmt(need)} {r.unit} a day
        </span>
      </p>
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
  // Age group: the person's own to start with; only global values change by age (ICMR-NIN has one set for adults).
  const [age, setAge] = useState<AgeGroup>(nutrients.ageGroup ?? "31-50");
  const hasAges = nutrients.rows.some((r) => r.ref?.byAge);
  const rowsForAge = useMemo(() => nutrients.rows.map((r) => (r.ref ? { ...r, ref: refForAge(r.ref, age) } : r)), [nutrients.rows, age]);
  const hasRef = rowsForAge.every((r) => r.ref);
  const [view, setView] = useState<View>(nutrients.basis === "adult" || !hasRef ? (hasRef ? "both" : "female") : nutrients.basis);
  const [kind, setKind] = useState<"all" | "vitamin" | "mineral">("all");
  const [asTable, setAsTable] = useState(false);
  // Simple first: India's daily need only. The global comparison (and the women/men switch) is opt-in.
  const [compare, setCompare] = useState(false);
  const primary: Guideline = nutrients.primary ?? "india";
  const hasDiet = Boolean(nutrients.dietEstimated) && rowsForAge.some((r) => r.diet !== undefined);
  const needFor = (r: NutrientRow, sex: Sex | "max") => (primary === "global" && !compare ? needs(r, sex).global : needs(r, sex).india);
  const guidelineName = primary === "global" && !compare ? "global" : "India's";

  const rows = rowsForAge.filter((r) => kind === "all" || r.kind === kind);
  const sexFor = (v: View): Sex | "max" => (v === "both" ? "max" : v);

  // Coverage groups for the selected requirement (Both → the higher, stricter value).
  const bins = useMemo(() => {
    const counts = BINS.map(() => 0);
    for (const r of rowsForAge) {
      const p = pct(r.amount, needFor(r, sexFor(view)));
      counts[BINS.findIndex((b) => p >= b.min)]++;
    }
    return counts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowsForAge, view, primary, compare]);

  // Where India and global guidelines differ the most (≥25%), for the selected sex.
  const diffs = useMemo(() => {
    const sexes: Sex[] = view === "both" ? ["female", "male"] : [view];
    return sexes.map((sex) => {
      const scored = rowsForAge
        .filter((r) => r.ref)
        .map((r) => ({ r, india: r.ref!.india[sex], global: r.ref!.global[sex] }))
        .map((x) => ({ ...x, ratio: x.india / x.global }));
      const more = scored.filter((x) => x.ratio >= 1.25).sort((a, b) => b.ratio - a.ratio).slice(0, 3);
      const less = scored.filter((x) => x.ratio <= 0.8).sort((a, b) => a.ratio - b.ratio).slice(0, 3);
      return { sex, more, less };
    });
  }, [rowsForAge, view]);

  const total = rowsForAge.length;
  // Safe upper limits: is everything (one serve + estimated meals) under them, and which is closest?
  const limits = rowsForAge
    .filter((r) => r.upper !== undefined)
    .map((r) => ({ r, share: r.upper ? towardLimit(r, hasDiet) / r.upper.amount : 0 }));
  const hasLimits = limits.length > 0;
  const allSafe = limits.every((x) => x.share < 1);
  const closest = [...limits].sort((a, b) => b.share - a.share)[0];
  const describe = (xs: { r: NutrientRow; india: number; global: number }[]) =>
    xs.map((x) => `${short(x.r.name)} (${fmt(x.india)} vs ${fmt(x.global)} ${x.r.unit})`).join(", ");

  return (
    <section aria-labelledby="nutrients-heading" className="glass-strong rounded-[var(--radius-glass)] p-6 sm:p-9">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-deep">Vitamins &amp; minerals</p>
      <h2 id="nutrients-heading" className="mt-3 font-display text-2xl text-forest sm:text-3xl">
        How one serve compares with your daily needs
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {primary === "global" ? (
          <>For each vitamin and mineral: how much of the amount your body needs every day one 10 g serve provides, based on global guidelines (US NIH).</>
        ) : (
          <>
            For each vitamin and mineral: how much of the amount your body needs every day one 10 g serve provides, based on Indian guidelines (ICMR-NIN —
            India&rsquo;s official nutrition standards).
          </>
        )}{" "}
        {hasDiet ? "We've also estimated what your meals already give you, from your answers about a typical week — so you can see the gap." : "Food gives you the rest."}
      </p>

      {/* Controls in one row above the chart. */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        {hasRef && (
          <button
            type="button"
            role="switch"
            aria-checked={compare}
            onClick={() => setCompare((c) => !c)}
            className={clsx(
              "inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              compare ? "bg-forest text-white" : "bg-white/70 text-forest shadow-[inset_0_0_0_1px_rgba(18,41,31,0.08)] hover:bg-sage/60",
            )}
          >
            <span className={clsx("relative h-4 w-7 rounded-full transition-colors", compare ? "bg-white/30" : "bg-forest/15")} aria-hidden>
              <span className={clsx("absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-[left]", compare ? "left-3.5" : "left-0.5")} />
            </span>
            Compare with global guidelines
          </button>
        )}
        {hasRef && compare && (
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
        {hasRef && hasAges && (compare || primary === "global") && (
          <Seg label="Age group" value={age} onChange={setAge} options={AGE_GROUPS.map((g) => ({ value: g.value, label: g.label }))} />
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
          How much of {guidelineName} daily need one serve covers{view === "both" ? " (using the higher of men's and women's needs)" : ""}
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

      {/* Is more than 100% too much? Honest, per-nutrient: compared with safe upper limits. */}
      {hasLimits && (
        <div className="mt-4 flex gap-3 rounded-2xl border border-teal/25 bg-[#eef7f2]/80 p-4 text-sm leading-relaxed text-forest sm:p-5">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-deep" aria-hidden />
          <div>
            <p className="font-medium">Going over 100% is safe at one serve a day</p>
            {allSafe ? (
              <p className="mt-1 text-muted">
                Your body uses what it needs, and every vitamin and mineral in one serve stays well below its safe upper limit (US NIH)
                {hasDiet ? ", even with what your meals already give you" : ""}.
                {closest && closest.share > 0 && (
                  <>
                    {" "}The closest is {short(closest.r.name)}, at about {Math.max(1, Math.round(closest.share * 100))}% of its limit.
                  </>
                )}{" "}
                Stick to one serve a day, and check with your doctor if you also take other supplements.
              </p>
            ) : (
              <p className="mt-1 text-muted">
                With your estimated meals, some nutrients come close to their safe upper limit. Stick to one serve a day and talk to your doctor before adding other supplements.
              </p>
            )}
          </div>
        </div>
      )}

      {/* India vs global: where the guidelines differ most. */}
      {hasRef && compare && diffs.some((d) => d.more.length || d.less.length) && (
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
        {hasDiet && !compare ? (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-full" style={{ background: DIET }} aria-hidden /> Your meals (estimated)
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-full" style={{ background: SERVE }} aria-hidden /> One serve of COMPLETE+
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3.5 w-[5px] rounded-sm" style={{ background: INDIA }} aria-hidden /> Your daily need ({primary === "global" ? "US NIH" : "ICMR-NIN 2020"})
            </span>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-4 rounded-full" style={{ background: AMOUNT }} aria-hidden /> One serve of COMPLETE+
            </span>
            {(compare || primary === "india") && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3.5 w-[5px] rounded-sm" style={{ background: INDIA }} aria-hidden /> India daily need (ICMR-NIN 2020)
              </span>
            )}
            {!compare && primary === "global" && (
              <span className="inline-flex items-center gap-1.5">
                <span className="h-3.5 w-[5px] rounded-sm" style={{ background: GLOBAL }} aria-hidden /> Global daily need (US NIH)
              </span>
            )}
          </>
        )}
        {compare && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3.5 w-[5px] rounded-sm" style={{ background: GLOBAL }} aria-hidden /> Global daily need (US NIH)
          </span>
        )}
      </div>

      {asTable ? (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-line/60">
                <th scope="col" className="py-2 pr-3 font-medium">Nutrient</th>
                <th scope="col" className="py-2 pr-3 font-medium">Per serve</th>
                {hasDiet && <th scope="col" className="py-2 pr-3 font-medium">Your meals (est.)</th>}
                {(compare && view === "both" ? (["female", "male"] as Sex[]) : [view === "both" ? ("female" as Sex) : (view as Sex)]).flatMap((s) => [
                  <th key={`${s}i`} scope="col" className="py-2 pr-3 font-medium">India{compare && view === "both" ? ` (${s === "female" ? "W" : "M"})` : ""}</th>,
                  ...(compare ? [<th key={`${s}g`} scope="col" className="py-2 pr-3 font-medium">Global{view === "both" ? ` (${s === "female" ? "W" : "M"})` : ""}</th>] : []),
                ])}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className="border-b border-line/40 last:border-0">
                  <th scope="row" className="py-2 pr-3 font-medium text-forest">{r.name}</th>
                  <td className="whitespace-nowrap py-2 pr-3 tabular-nums">{fmt(r.amount)} {r.unit}</td>
                  {hasDiet && <td className="whitespace-nowrap py-2 pr-3 tabular-nums text-muted">{r.diet !== undefined ? `≈ ${fmt(r.diet)} ${r.unit}` : "—"}</td>}
                  {(compare && view === "both" ? (["female", "male"] as Sex[]) : [view === "both" ? ("female" as Sex) : (view as Sex)]).flatMap((s) => {
                    const n = needs(r, compare || view !== "both" ? s : "max");
                    return [
                      <td key={`${s}i`} className="whitespace-nowrap py-2 pr-3 tabular-nums text-muted">{fmt(n.india)} {r.unit} <span className="text-forest">({pct(r.amount, n.india)}%)</span></td>,
                      ...(compare
                        ? [<td key={`${s}g`} className="whitespace-nowrap py-2 pr-3 tabular-nums text-muted">{fmt(n.global)} {r.unit} <span className="text-forest">({pct(r.amount, n.global)}%)</span></td>]
                        : []),
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
                {r.sources && r.sources.length > 0 && (
                  <p className="mt-1.5 flex gap-1.5 text-xs leading-snug text-muted">
                    <Utensils className="mt-px h-3.5 w-3.5 shrink-0 text-teal-deep" aria-hidden />
                    <span>
                      <span className="sr-only">Found in: </span>
                      {r.sources.join(", ")}
                    </span>
                  </p>
                )}
                {r.upper !== undefined && pct(r.amount + (hasDiet && !compare ? (r.diet ?? 0) : 0), needFor(r, sexFor(view))) > 100 && (
                  <p className="mt-1.5 flex gap-1.5 text-xs leading-snug text-teal-deep">
                    <ShieldCheck className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>
                      Over 100% is safe —{" "}
                      {r.upper
                        ? `limit ${fmt(r.upper.amount)} ${r.unit} a day${r.upper.from === "supplements" ? " from supplements" : ""}`
                        : "no upper limit has been set"}
                    </span>
                  </p>
                )}
              </div>
              {compare && view === "both" && hasRef ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Bullet r={r} sex="female" label="Women" />
                  <Bullet r={r} sex="male" label="Men" />
                </div>
              ) : hasDiet && !compare && r.diet !== undefined ? (
                <DietBar r={r} sex={sexFor(view)} primary={primary} />
              ) : (
                <Bullet r={r} sex={sexFor(view)} showGlobal={compare} primary={primary} />
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-5 text-xs leading-relaxed text-muted">
        Food lists are everyday sources, matched to how you eat. Safe upper limits: US NIH tolerable upper intake levels for adults.{" "}
        India: ICMR-NIN &ldquo;Nutrient Requirements for Indians&rdquo; (2020), adults. Global: US National Institutes of Health RDA/AI
        {hasAges ? `, ages ${AGE_GROUPS.find((g) => g.value === age)?.label}` : ", adults 19–50"}. India&rsquo;s guidelines use one set of values for all adults; globally, magnesium,
        vitamin B6, iron (women) and vitamin D needs change with age.
        A supplement adds to what you get from food — it isn&rsquo;t meant to cover 100% on its own.
        {hasDiet && " Meal estimates are rough averages from typical Indian portions (IFCT 2017) and your answers — not a lab measurement."}
      </p>
    </section>
  );
}
