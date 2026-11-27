import type { AssessmentResult } from "@/engine";
import { CountUp } from "./CountUp";
import { COVERAGE, TRACK } from "./palette";

type Wellness = NonNullable<AssessmentResult["wellness"]>;

/** Ring colour steps with the score (one hue, light → dark = better). */
const ringColor = (score: number) => (score >= 85 ? COVERAGE[3] : score >= 70 ? COVERAGE[2] : score >= 50 ? COVERAGE[1] : COVERAGE[0]);

/**
 * The overall wellness score (0–100, higher = doing better) as a hero number
 * in a ring, plus one bar per pillar on the same 0–100 scale. A single series,
 * so no legend: every bar is labelled with its name and number.
 */
export function WellnessScore({ wellness }: { wellness: Wellness }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const color = ringColor(wellness.score);
  return (
    <section aria-labelledby="wellness-heading" className="glass-strong rounded-[var(--radius-glass)] p-6 sm:p-8">
      <div className="grid items-center gap-8 md:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex flex-col items-center text-center">
          <p id="wellness-heading" className="text-xs font-medium uppercase tracking-[0.2em] text-teal-deep">
            Overall wellness score
          </p>
          <div className="relative mt-4 h-40 w-40">
            <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" role="img" aria-label={`Wellness score ${wellness.score} out of 100: ${wellness.label}`}>
              <circle cx="64" cy="64" r={r} fill="none" stroke={TRACK} strokeWidth="10" />
              <circle
                cx="64"
                cy="64"
                r={r}
                fill="none"
                stroke={color}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${(wellness.score / 100) * c} ${c}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className="font-display text-5xl leading-none text-forest">
                <CountUp value={wellness.score} />
              </p>
              <p className="mt-1 text-xs text-muted">out of 100</p>
            </div>
          </div>
          <p className="mt-3 rounded-full bg-white/70 px-3 py-1 text-sm font-medium text-forest shadow-[inset_0_0_0_1px_rgba(18,41,31,0.08)]">{wellness.label}</p>
        </div>

        <div>
          <h3 className="font-display text-xl text-forest">How you&rsquo;re doing in each part of your wellbeing</h3>
          <p className="mt-1 text-sm text-muted">Higher is better. Based on how you said you feel and your daily habits — not a medical test.</p>
          <ul className="mt-5 space-y-3">
            {wellness.pillars.map((p) => (
              <li key={p.key} className="grid grid-cols-[7.5rem_minmax(0,1fr)_2.5rem] items-center gap-3 text-sm" title={`${p.name}: ${p.score}/100`}>
                <span className="text-forest">{p.name}</span>
                <span className="relative h-2.5 rounded-full" style={{ background: TRACK }} aria-hidden>
                  <span className="bar-grow absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.max(2, p.score)}%`, background: COVERAGE[2] }} />
                </span>
                <span className="text-right font-medium tabular-nums text-forest">
                  {p.score}
                  <span className="sr-only"> out of 100</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
