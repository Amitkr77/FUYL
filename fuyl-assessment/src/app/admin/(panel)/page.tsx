import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge, Card, Empty, PageHeader, Stat, fmtDate } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin/auth";
import { getDraft, getLatestVersion } from "@/lib/admin/kbStore";
import { getDashboardMetrics } from "@/lib/admin/metrics";
import { diffKnowledgeBases, reviewCounts } from "@/kb/draft";
import type { KnowledgeBase } from "@/engine";

export const dynamic = "force-dynamic";

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)}%` : "—");

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  await requireAdminPage();
  const { denied } = await searchParams;
  const [m, draft, live] = await Promise.all([getDashboardMetrics(30), getDraft(), getLatestVersion()]);
  const pending = reviewCounts(draft.kb, draft.reviews).pending.length;
  const changes = live ? diffKnowledgeBases(live.kb as KnowledgeBase, draft.kb).length : null;
  const questionPrompt = new Map(draft.kb.questions.map((q) => [q.key, q.prompt.replace(/\{name\},?\s*/g, "")]));
  const maxDaily = Math.max(1, ...m.daily.map((d) => d.submissions));
  const maxArea = Math.max(1, ...m.topAreas.map((a) => a.count));

  const alerts: { tone: "warn" | "bad"; text: string; href: string }[] = [];
  if (!live) alerts.push({ tone: "bad", text: "Nothing is published yet — the public assessment stays closed until a reviewed version is published.", href: "/admin/review" });
  if (m.sync.labelReviewNeeded) alerts.push({ tone: "bad", text: "A COMPLETE+ label image changed on fuyl.in — review ingredient doses.", href: "/admin/sync" });
  if (pending) alerts.push({ tone: "warn", text: `${pending} content item(s) waiting for reviewer approval.`, href: "/admin/review" });
  if (changes) alerts.push({ tone: "warn", text: `${changes} unpublished change(s) in the draft.`, href: "/admin/review" });
  if (m.sync.stale)
    alerts.push({ tone: "warn", text: "fuyl.in hasn't synced successfully in the last 3 days.", href: "/admin/sync" });

  return (
    <>
      <PageHeader title="Dashboard" description={`Last ${m.days} days · live knowledge base ${live ? `v${live.version}` : "not published"}`} />
      {denied && <p className="mb-6 rounded-xl bg-[#fde8e4] px-4 py-3 text-sm text-[#a3301e]">You don&rsquo;t have permission to open that page.</p>}

      <div className="mb-8 space-y-2">
        {alerts.length === 0 ? (
          <p className="flex items-center gap-2 rounded-xl bg-sage/60 px-4 py-3 text-sm text-forest">
            <CheckCircle2 className="h-4 w-4" aria-hidden /> All good — content published, reviewed and in sync.
          </p>
        ) : (
          alerts.map((a) => (
            <Link
              key={a.text}
              href={a.href}
              className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${a.tone === "bad" ? "bg-[#fde8e4] text-[#a3301e]" : "bg-[#fdf0e3] text-[#9a5a1c]"}`}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden /> {a.text}
            </Link>
          ))
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Started" value={m.funnel.started} />
        <Stat label="Completed" value={m.funnel.completed} hint={`${pct(m.funnel.completed, m.funnel.started)} of started`} />
        <Stat label="Unlocked (email)" value={m.funnel.submitted} hint={`${pct(m.funnel.submitted, m.funnel.completed)} of completed`} />
        <Stat label="Clicked to fuyl.in" value={m.funnel.clicked} hint={`${pct(m.funnel.clicked, m.funnel.submitted)} of unlocked`} />
        <Stat label="Safety stops" value={m.funnel.stopped} hint="Under 19 / pregnancy" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Reports per day (last 14 days)">
          <div className="flex h-36 items-end gap-1.5" role="img" aria-label="Reports per day">
            {m.daily.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full rounded-t-md bg-teal/70" style={{ height: `${(d.submissions / maxDaily) * 100}%`, minHeight: d.submissions ? 4 : 1 }} title={`${d.date}: ${d.submissions}`} />
                <span className="text-[9px] tabular-nums text-muted">{d.date.slice(8)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Most common focus areas">
          {m.topAreas.length === 0 ? (
            <Empty>No reports yet.</Empty>
          ) : (
            <ul className="space-y-2">
              {m.topAreas.map((a) => (
                <li key={a.name} className="flex items-center gap-3 text-sm">
                  <span className="w-40 shrink-0 truncate text-forest">{a.name}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-cream">
                    <span className="block h-full rounded-full bg-forest" style={{ width: `${(a.count / maxArea) * 100}%` }} />
                  </span>
                  <span className="w-8 text-right tabular-nums text-muted">{a.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Where people stop (abandoned after…)">
          {m.dropOff.length === 0 ? (
            <Empty>No abandoned assessments yet.</Empty>
          ) : (
            <ul className="divide-y divide-line/50 text-sm">
              {m.dropOff.map((d) => (
                <li key={d.lastAnswered} className="flex items-center justify-between gap-3 py-2">
                  <span className="truncate text-forest" title={d.lastAnswered}>
                    {questionPrompt.get(d.lastAnswered) ?? d.lastAnswered}
                  </span>
                  <Badge tone="warn">{d.count}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Safety outcomes">
          {m.safety.length === 0 ? (
            <Empty>No reports yet.</Empty>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {m.safety.map((s) => (
                <li key={s.level}>
                  <Badge tone={s.level === "stop" ? "bad" : s.level === "consult" ? "warn" : s.level === "none" ? "good" : "info"}>
                    {s.level === "none" ? "No notes" : s.level} · {s.count}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Recent activity" className="mt-6" actions={<Link href="/admin/activity" className="text-xs text-teal-deep hover:underline">View all</Link>}>
        {m.recentActivity.length === 0 ? (
          <Empty>No activity yet.</Empty>
        ) : (
          <ul className="divide-y divide-line/50 text-sm">
            {m.recentActivity.map((a, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-forest">
                  <span className="font-medium">{a.actor ?? "system"}</span> · {a.action}
                  {a.target ? ` · ${a.target}` : ""}
                </span>
                <span className="text-xs text-muted">{fmtDate(a.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
