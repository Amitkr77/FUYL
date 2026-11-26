import Link from "next/link";
import { Card, Empty, PageHeader, Stat } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin/auth";
import { buildFunnel, type Funnel } from "@/lib/admin/funnel";
import { getKnowledgeBase } from "@/lib/kb";

export const dynamic = "force-dynamic";

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
const RANGES = [7, 30, 90];
const MODES: Funnel["mode"][] = ["all", "standard", "assisted"];

export default async function FunnelPage({ searchParams }: { searchParams: Promise<{ days?: string; mode?: string }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const days = RANGES.includes(Number(sp.days)) ? Number(sp.days) : 30;
  const mode = (MODES as string[]).includes(sp.mode ?? "") ? (sp.mode as Funnel["mode"]) : "all";
  const kb = await getKnowledgeBase();
  const f = await buildFunnel(kb, days, mode);
  const worst = [...f.rows].filter((r) => r.left > 0).sort((a, b) => pct(b.left, b.reached) - pct(a.left, a.reached))[0];
  const link = (d: number, m: string) => `/admin/funnel?days=${d}&mode=${m}`;

  return (
    <>
      <PageHeader
        title="Drop-off"
        description="Where people leave the assessment, worked out from their sessions. A session that's been idle for 30 minutes without finishing counts as having left on the question it was showing."
      />
      <div className="mb-6 flex flex-wrap gap-2 text-sm">
        {RANGES.map((d) => (
          <Link key={d} href={link(d, mode)} className={`rounded-full px-3 py-1.5 ${d === days ? "bg-forest text-white" : "border border-line bg-white text-forest"}`}>
            Last {d} days
          </Link>
        ))}
        <span className="mx-2 w-px bg-line" aria-hidden />
        {MODES.map((m) => (
          <Link key={m} href={link(days, m)} className={`rounded-full px-3 py-1.5 capitalize ${m === mode ? "bg-forest text-white" : "border border-line bg-white text-forest"}`}>
            {m}
          </Link>
        ))}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="Started" value={f.started} hint={`${f.inProgress} still in progress`} />
        <Stat label="Answered the first question" value={f.answeredOne} hint={`${pct(f.answeredOne, f.started)}% of starts`} />
        <Stat label="Reached the email step" value={f.finished} hint={`${pct(f.finished, f.started)}% of starts`} />
        <Stat label="Got their report" value={f.submitted} hint={`${pct(f.submitted, f.finished)}% of those who reached the email step`} />
      </div>

      {worst && (
        <p className="mb-6 rounded-2xl bg-[#fdf0e3] px-4 py-3 text-sm text-[#7a4a12]">
          Biggest drop: <strong>{worst.prompt}</strong> — {pct(worst.left, worst.reached)}% of people who saw it left there.
        </p>
      )}

      <Card title="Question by question">
        {f.rows.length === 0 ? (
          <Empty>No sessions in this period yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr className="border-b border-line/60">
                  <th className="py-2 pr-3 font-medium">Question</th>
                  <th className="py-2 pr-3 text-right font-medium">Saw it</th>
                  <th className="py-2 pr-3 text-right font-medium">Left here</th>
                  <th className="w-56 py-2 font-medium">Drop-off</th>
                </tr>
              </thead>
              <tbody>
                {f.rows.map((r) => {
                  const d = pct(r.left, r.reached);
                  return (
                    <tr key={r.key} className="border-b border-line/40 last:border-0">
                      <td className="py-2.5 pr-3">
                        <span className="text-forest">{r.prompt}</span>
                        <span className="ml-2 font-mono text-[11px] text-muted">{r.key}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{r.reached}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{r.left}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-forest/10">
                            <div className={`h-full rounded-full ${d >= 15 ? "bg-[#d9725f]" : d >= 5 ? "bg-ember" : "bg-teal"}`} style={{ width: `${Math.min(100, d)}%` }} />
                          </div>
                          <span className="w-10 text-right text-xs tabular-nums">{d}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="mt-4 text-xs text-muted">
        {f.stopped} session{f.stopped === 1 ? "" : "s"} ended at a safety stop (e.g. under 19 or pregnant) — expected, not a drop-off.
      </p>
    </>
  );
}
