import type { ProfileArea } from "@/engine";
import { INDIA, TRACK } from "./palette";

/**
 * "Your wellness profile": match % for every focus area as a radar, with the
 * exact numbers in a ranked list beside it (the list is also the accessible
 * equivalent — the radar alone is hard to read precisely). Areas in the report
 * are emphasised. Pure SVG, server-rendered, prints cleanly.
 */

const SIZE = 480;
const C = SIZE / 2;
const R = 156;
const RINGS = [25, 50, 75, 100];

const point = (i: number, n: number, value: number) => {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
  const r = (Math.max(0, Math.min(100, value)) / 100) * R;
  return { x: C + Math.cos(a) * r, y: C + Math.sin(a) * r, a };
};

/** Two-line labels for long names, so they don't run off the edge. */
function labelLines(name: string): string[] {
  if (name.length <= 12) return [name];
  const words = name.split(" ");
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}

export function ProfileRadar({ profile, compact = false }: { profile: ProfileArea[]; compact?: boolean }) {
  const n = profile.length;
  if (n < 3) return null;
  const pts = profile.map((p, i) => point(i, n, p.match));
  const poly = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const ranked = [...profile].sort((a, b) => b.match - a.match || Number(b.shown) - Number(a.shown));

  return (
    <section aria-labelledby="profile-chart-heading" className={compact ? "glass-strong h-full rounded-[var(--radius-glass)] p-5 sm:p-7" : "glass-strong rounded-[var(--radius-glass)] p-6 sm:p-9"}>
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-teal-deep">Your wellness profile</p>
      <h2 id="profile-chart-heading" className={compact ? "mt-2 font-display text-xl text-forest" : "mt-3 font-display text-2xl text-forest sm:text-3xl"}>
        Where your answers point
      </h2>
      <p className="mt-1.5 text-sm text-muted">
        {compact ? "Match across all 11 areas. Bolder = in your report." : "How strongly each of the 11 focus areas matches your answers (outer ring = 100%). The bolder areas are in your report."}
      </p>

      <div className={compact ? "mt-3" : "mt-6 grid items-center gap-6 md:grid-cols-[1.35fr_1fr]"}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="mx-auto w-full max-w-[480px]" role="img" aria-labelledby="radar-title radar-desc">
          <title id="radar-title">Wellness profile radar</title>
          <desc id="radar-desc">{ranked.map((p) => `${p.name} ${p.match}%`).join(", ")}</desc>
          {/* Rings and spokes — recessive. */}
          {RINGS.map((v) => (
            <polygon
              key={v}
              points={profile.map((_, i) => { const q = point(i, n, v); return `${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join(" ")}
              fill={v === 100 ? "rgba(255,255,255,0.55)" : "none"}
              stroke={TRACK}
              strokeWidth={1}
            />
          ))}
          {profile.map((_, i) => {
            const q = point(i, n, 100);
            return <line key={i} x1={C} y1={C} x2={q.x} y2={q.y} stroke={TRACK} strokeWidth={1} />;
          })}
          {[50].map((v) => (
            <text key={v} x={C + 5} y={C - (v / 100) * R - 4} className="fill-muted text-[12px]">
              {v}%
            </text>
          ))}

          {/* The profile shape grows in from the centre (CSS; no animation for reduced motion). */}
          <g className="radar-grow" style={{ transformOrigin: `${C}px ${C}px` }}>
            <polygon points={poly} fill={INDIA} fillOpacity={0.16} stroke={INDIA} strokeWidth={2} strokeLinejoin="round" />
            {profile.map((p, i) => (
              <g key={p.key}>
                {/* Bigger invisible hit target for the hover tooltip. */}
                <circle cx={pts[i].x} cy={pts[i].y} r={12} fill="transparent">
                  <title>{`${p.name}: ${p.match}% match${p.shown ? " — in your report" : ""}`}</title>
                </circle>
                <circle cx={pts[i].x} cy={pts[i].y} r={p.shown ? 5 : 4} fill={p.shown ? INDIA : "#ffffff"} stroke={p.shown ? "#ffffff" : INDIA} strokeWidth={2} pointerEvents="none" />
              </g>
            ))}
          </g>

          {/* Labels around the edge. */}
          {profile.map((p, i) => {
            const a = (i / n) * Math.PI * 2 - Math.PI / 2;
            const x = C + Math.cos(a) * (R + 20);
            const y = C + Math.sin(a) * (R + 20);
            const anchor = Math.abs(Math.cos(a)) < 0.2 ? "middle" : Math.cos(a) > 0 ? "start" : "end";
            const lines = labelLines(p.name);
            return (
              <text
                key={p.key}
                x={x}
                y={y - (lines.length - 1) * 8 + 5}
                textAnchor={anchor}
                className={p.shown ? "fill-forest text-[15px] font-semibold" : "fill-muted text-[14px]"}
              >
                {lines.map((l, k) => (
                  <tspan key={k} x={x} dy={k === 0 ? 0 : 16}>
                    {l}
                  </tspan>
                ))}
              </text>
            );
          })}
        </svg>

        {/* Exact numbers — ranked meter list (folded away in the compact tile). */}
        <ScoreList ranked={ranked} compact={compact} />
      </div>
    </section>
  );
}

function ScoreList({ ranked, compact }: { ranked: ProfileArea[]; compact: boolean }) {
  const list = (
        <ol className="space-y-2.5" aria-label="Match by focus area">
          {ranked.map((p) => (
            <li key={p.key} className="grid grid-cols-[minmax(0,1fr)_76px_38px] items-center gap-3 text-sm">
              <span className={p.shown ? "font-medium leading-snug text-forest" : "leading-snug text-muted"}>
                {p.name}
                {p.isPriority && <span className="ml-1.5 rounded-full bg-sage/80 px-1.5 py-0.5 text-[10px] font-medium text-forest">priority</span>}
              </span>
              <span className="h-1.5 overflow-hidden rounded-full" style={{ background: TRACK }} aria-hidden>
                <span className="block h-full rounded-full" style={{ width: `${Math.max(p.match, p.match ? 3 : 0)}%`, background: p.shown ? INDIA : "rgba(0,137,123,0.45)" }} />
              </span>
              <span className={`text-right tabular-nums ${p.shown ? "font-medium text-forest" : "text-muted"}`}>{p.match}%</span>
            </li>
          ))}
        </ol>
  );
  if (!compact) return list;
  return (
    <details className="group mt-2 rounded-2xl bg-white/50 px-4 py-3">
      <summary className="cursor-pointer list-none text-sm font-medium text-teal-deep">
        <span className="group-open:hidden">See every area&rsquo;s score</span>
        <span className="hidden group-open:inline">Hide scores</span>
      </summary>
      <div className="mt-3">{list}</div>
    </details>
  );
}
