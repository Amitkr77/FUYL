import { AlertTriangle, CheckCircle2, FlaskConical, Leaf, ShieldCheck, Sparkles, Target } from "lucide-react";
import { CountUp } from "./charts/CountUp";
import type { AssessmentResult, Finding, NutrientRow } from "@/engine";

/** Report sections added on top of the original layout: the summary of findings and the India-vs-global nutrient table. */

const FINDING_ICON: Record<Finding["kind"], typeof Target> = {
  focus: Target,
  safety: ShieldCheck,
  nutrition: FlaskConical,
  ingredients: Leaf,
};

export interface FindingStats {
  areas: number;
  ingredients: number;
  nutrientsHalf?: { count: number; total: number };
  safety: { level: AssessmentResult["safety"]["level"]; checks: number };
}

function Tile({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl bg-white/65 p-4 shadow-[inset_0_0_0_1px_rgba(18,41,31,0.06)]">
      <p className="font-display text-3xl leading-none text-forest sm:text-4xl">{children}</p>
      <p className="mt-2 text-xs leading-snug text-muted">{label}</p>
    </div>
  );
}

/** Headline numbers: the stat-tile row at the top of the findings card. */
function StatTiles({ stats }: { stats: FindingStats }) {
  const serious = stats.safety.level === "consult" || stats.safety.level === "caution" || stats.safety.level === "stop";
  return (
    <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Tile label={stats.areas === 1 ? "focus area for you" : "focus areas for you"}>
        <CountUp value={stats.areas} />
      </Tile>
      <Tile label="COMPLETE+ ingredients matched to you">
        <CountUp value={stats.ingredients} />
      </Tile>
      {stats.nutrientsHalf && (
        <Tile label="vitamins & minerals at 50%+ of India's daily need">
          <CountUp value={stats.nutrientsHalf.count} />
          <span className="text-lg text-muted">/{stats.nutrientsHalf.total}</span>
        </Tile>
      )}
      <Tile label={serious ? `thing${stats.safety.checks === 1 ? "" : "s"} to check with your doctor` : "safety check"}>
        {serious ? (
          <span className="inline-flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-ember-deep" aria-hidden />
            <CountUp value={stats.safety.checks} />
          </span>
        ) : (
          <span className="inline-flex items-center gap-2 text-2xl sm:text-3xl">
            <ShieldCheck className="h-6 w-6 text-teal-deep" aria-hidden /> Clear
          </span>
        )}
      </Tile>
    </div>
  );
}

export function FindingsCard({ findings, stats }: { findings: NonNullable<AssessmentResult["findings"]>; stats?: FindingStats }) {
  return (
    <section aria-labelledby="findings-heading" className="glass-strong rounded-[var(--radius-glass)] p-6 sm:p-9">
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-teal-deep">
        <Sparkles className="h-3.5 w-3.5" aria-hidden /> Summary of your findings
      </p>
      <h2 id="findings-heading" className="mt-3 text-balance font-display text-2xl leading-snug text-forest sm:text-3xl">
        {findings.headline}
      </h2>
      {stats && <StatTiles stats={stats} />}
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

/** Short "% of daily need" text for an ingredient tile, from the comparison rows. */
export function nutrientNote(rows: NutrientRow[] | undefined, key: string): string | null {
  const r = rows?.find((x) => x.key === key);
  return r ? `${r.indiaPct}% India · ${r.globalPct}% global daily need` : null;
}
