import type { AssessmentResult } from "@/engine";
import { CountUp } from "./CountUp";
import { COVERAGE, TRACK } from "./palette";

type Wellness = NonNullable<AssessmentResult["wellness"]>;

/** Ring colour steps with the score (one hue, light → dark = better). */
const ringColor = (score: number) => (score >= 85 ? COVERAGE[3] : score >= 70 ? COVERAGE[2] : score >= 50 ? COVERAGE[1] : COVERAGE[0]);

/** A simple standing human figure in a 100 × 210 box (head + one body outline). */
const BODY_PATH =
  "M43 36 L57 36 C66 37 76 40 80 46 C83 50 84 56 85 64 L88 104 C89 110 82 112 80 107 L73 62 L70 114 " +
  "C70 118 70 120 69 124 L67 198 C67 205 55 205 55 198 L53 132 C52.5 128 47.5 128 47 132 L45 198 " +
  "C45 205 33 205 33 198 L31 124 C30 120 30 118 30 114 L27 62 L20 107 C18 112 11 110 12 104 L15 64 " +
  "C16 56 17 50 20 46 C24 40 34 37 43 36 Z";

function BodyShape() {
  return (
    <>
      <circle cx="50" cy="19" r="14" />
      <path d={BODY_PATH} />
    </>
  );
}

/**
 * The overall wellness score (0–100, higher = doing better) as a human body
 * silhouette filled from the feet up to the score, next to the hero number;
 * plus one bar per pillar on the same 0–100 scale. A single series, so no
 * legend: every bar is labelled with its name and number.
 */
export function WellnessScore({ wellness }: { wellness: Wellness }) {
  const color = ringColor(wellness.score);
  // The figure spans y = 5…204; fill from the feet up to the score.
  const top = 5 + 199 * (1 - Math.min(100, Math.max(0, wellness.score)) / 100);
  return (
    <section aria-labelledby="wellness-heading" className="@container glass-strong rounded-[var(--radius-glass)] p-6 sm:p-8">
      <div className="grid items-center gap-8 @xl:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex flex-col items-center text-center">
          <p id="wellness-heading" className="text-xs font-medium uppercase tracking-[0.2em] text-teal-deep">
            Overall wellness score
          </p>
          <div className="mt-4 flex items-center gap-5">
            <svg viewBox="0 0 100 210" className="h-48 w-auto" role="img" aria-label={`Wellness score ${wellness.score} out of 100: ${wellness.label}`}>
              <defs>
                <clipPath id="wellness-body">
                  <BodyShape />
                </clipPath>
              </defs>
              <g fill={TRACK}>
                <BodyShape />
              </g>
              <g clipPath="url(#wellness-body)">
                <rect className="body-fill" x="0" y={top} width="100" height={210 - top} fill={color} />
                {/* Fill level: a thin surface line so the edge reads clearly. */}
                <rect x="0" y={top} width="100" height="1.5" fill="#ffffff" opacity="0.7" />
              </g>
            </svg>
            <div className="text-left">
              <p className="font-display text-6xl leading-none text-forest">
                <CountUp value={wellness.score} />
              </p>
              <p className="mt-1 text-xs text-muted">out of 100</p>
              <p className="mt-3 inline-block rounded-full bg-white/70 px-3 py-1 text-sm font-medium text-forest shadow-[inset_0_0_0_1px_rgba(18,41,31,0.08)]">
                {wellness.label}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-display text-xl text-forest">How you&rsquo;re doing in each part of your wellbeing</h3>
          <p className="mt-1 text-sm text-muted">Higher is better. Based on how you said you feel and your daily habits — not a medical test.</p>
          <ul className="mt-5 space-y-3">
            {wellness.pillars.map((p) => (
              <li key={p.key} className="grid grid-cols-[6.5rem_minmax(0,1fr)_2.25rem] items-center gap-3 text-sm @sm:grid-cols-[7.5rem_minmax(0,1fr)_2.5rem]" title={`${p.name}: ${p.score}/100`}>
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
