import type { BlendSummary } from "@/engine";
import { INDIA, TRACK } from "./palette";

/**
 * "What's inside your COMPLETE+": the formula by blend as a ranked bar list
 * (bars ∝ mg per serve). Blends containing ingredients matched to this
 * person's focus areas are highlighted, with how many and which.
 */
export function FormulaBars({ blends }: { blends: BlendSummary[] }) {
  const max = Math.max(...blends.map((b) => b.mg ?? 0), 1);
  const matched = blends.reduce((s, b) => s + b.forYou, 0);

  return (
    <section aria-labelledby="formula-heading" className="glass-strong rounded-[var(--radius-glass)] p-6 sm:p-9">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-deep">What&rsquo;s inside</p>
      <h2 id="formula-heading" className="mt-3 font-display text-2xl text-forest sm:text-3xl">
        Your COMPLETE+, blend by blend
      </h2>
      <p className="mt-2 text-sm text-muted">
        One 10 g serve, as printed on the label. <strong className="font-medium text-forest">{matched} ingredients</strong> across the highlighted blends
        support your focus areas.
      </p>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: INDIA }} aria-hidden /> Has ingredients for you
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm border border-line bg-white" aria-hidden /> Rest of your daily base
        </span>
      </div>

      <ul className="mt-6 space-y-3.5">
        {blends.map((b) => (
          <li key={b.name} className="grid gap-1.5 sm:grid-cols-[minmax(0,13rem)_1fr_auto] sm:items-center sm:gap-4">
            <div className="flex items-baseline justify-between gap-3 sm:block">
              <p className={`text-sm ${b.forYou ? "font-medium text-forest" : "text-muted"}`}>{b.name}</p>
              <p className="text-xs tabular-nums text-muted sm:hidden">{b.dose}</p>
            </div>
            <div className="flex items-center gap-3">
              {b.mg ? (
                <span className="block h-2.5 flex-1 overflow-hidden rounded-full" style={{ background: TRACK }}>
                  <span
                    className="block h-full rounded-full border"
                    style={{
                      width: `${Math.max(2, (b.mg / max) * 100)}%`,
                      background: b.forYou ? INDIA : "#ffffff",
                      borderColor: b.forYou ? INDIA : "rgba(18,41,31,0.18)",
                    }}
                    title={`${b.name}: ${b.dose}`}
                  />
                </span>
              ) : (
                <span className="flex-1 text-xs text-muted">{/cfu/i.test(b.dose) ? "Live cultures — measured in CFU, not mg" : "Vitamins & minerals — see the comparison above"}</span>
              )}
              <span className="hidden w-24 shrink-0 text-right text-xs tabular-nums text-muted sm:inline">{b.dose}</span>
            </div>
            <div className="sm:w-28 sm:text-right">
              {b.forYou > 0 && (
                <span
                  className="inline-flex items-center rounded-full bg-sage px-2 py-0.5 text-[11px] font-medium text-forest"
                  title={b.forYouNames.join(", ")}
                >
                  {b.forYou} of {b.total} for you
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
