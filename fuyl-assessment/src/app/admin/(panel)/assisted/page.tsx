import Link from "next/link";
import { AssistedSettingsForm } from "@/components/admin/AssistedSettingsForm";
import { Badge, Card, Empty, PageHeader, Stat, fmtDate } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin/auth";
import { aiUsageDays, getAssistedSettings } from "@/lib/assisted";
import { connectDB } from "@/lib/db";
import { env } from "@/lib/env";
import { AssessmentSession } from "@/models/assessment";

export const dynamic = "force-dynamic";

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000);
const utcToday = () => new Date().toISOString().slice(0, 10);

const STATUS_TONE = { active: "info", stopped: "warn", complete: "good", submitted: "good" } as const;

export default async function AssistedPage() {
  const admin = await requireAdminPage();
  await connectDB();
  const weekAgo = daysAgo(7);
  const [settings, usage, chats, started, finished] = await Promise.all([
    getAssistedSettings(),
    aiUsageDays(14),
    AssessmentSession.find(
      { mode: "assisted" },
      { status: 1, createdAt: 1, email: 1, "chat.userTurns": 1, "chat.aiTurns": 1, "chat.fallbackTurns": 1, "chat.settings": 1 },
    )
      .sort({ createdAt: -1 })
      .limit(40)
      .lean(),
    AssessmentSession.countDocuments({ mode: "assisted", createdAt: { $gte: weekAgo } }),
    AssessmentSession.countDocuments({ mode: "assisted", status: "submitted", createdAt: { $gte: weekAgo } }),
  ]);
  const today = usage.find((u) => u._id === utcToday());
  const hasKey = Boolean(env().GROQ_API_KEY);

  return (
    <>
      <PageHeader
        title="Assisted assessment"
        description="The AI chat version of the assessment. Answers still go through the rules engine: safety stops, scoring and the result are the same as the standard assessment."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        <Stat label="AI requests today" value={today?.calls ?? 0} hint={`Cap ${settings.dailyAiCap}`} />
        <Stat label="Fallbacks today" value={today?.fallbacks ?? 0} hint="Turns answered without AI" />
        <Stat label="Chats (7 days)" value={started} />
        <Stat label="Finished (7 days)" value={finished} hint={started ? `${Math.round((finished / started) * 100)}% completion` : undefined} />
      </div>

      <AssistedSettingsForm initial={settings} canEdit={admin.role === "admin"} hasKey={hasKey} />

      <Card title="Recent chats" className="mt-6">
        {chats.length === 0 ? (
          <Empty>No chats yet.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr className="border-b border-line/60">
                  <th className="py-2 pr-3 font-medium">Started</th>
                  <th className="py-2 pr-3 font-medium">Email</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 font-medium">Mode</th>
                  <th className="py-2 pr-3 font-medium">Messages</th>
                  <th className="py-2 font-medium">AI / fallback turns</th>
                </tr>
              </thead>
              <tbody>
                {chats.map((c) => {
                  const s = (c.chat?.settings ?? {}) as { mode?: string; provider?: string };
                  return (
                    <tr key={c._id} className="border-b border-line/40 last:border-0">
                      <td className="whitespace-nowrap py-2.5 pr-3">
                        <Link href={`/admin/assisted/${c._id}`} className="text-teal-deep hover:underline">
                          {fmtDate(c.createdAt)}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3">{c.email ?? "—"}</td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={STATUS_TONE[c.status as keyof typeof STATUS_TONE] ?? "neutral"}>{c.status}</Badge>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-muted">
                        {s.mode ?? "—"} · {s.provider ?? "—"}
                      </td>
                      <td className="py-2.5 pr-3 tabular-nums">{c.chat?.userTurns ?? 0}</td>
                      <td className="py-2.5 tabular-nums">
                        {c.chat?.aiTurns ?? 0} / {c.chat?.fallbackTurns ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="AI usage (last 14 days)" className="mt-6">
        {usage.length === 0 ? (
          <Empty>No AI requests yet.</Empty>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted">
              <tr className="border-b border-line/60">
                <th className="py-2 pr-3 font-medium">Day (UTC)</th>
                <th className="py-2 pr-3 font-medium">Requests</th>
                <th className="py-2 pr-3 font-medium">Failures</th>
                <th className="py-2 pr-3 font-medium">Fallbacks</th>
                <th className="py-2 font-medium">Tokens in / out</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((u) => (
                <tr key={u._id} className="border-b border-line/40 tabular-nums last:border-0">
                  <td className="py-2 pr-3">{u._id}</td>
                  <td className="py-2 pr-3">{u.calls}</td>
                  <td className="py-2 pr-3">{u.failures}</td>
                  <td className="py-2 pr-3">{u.fallbacks}</td>
                  <td className="py-2">
                    {u.promptTokens.toLocaleString("en-IN")} / {u.completionTokens.toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
