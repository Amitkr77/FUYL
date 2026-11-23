import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ChatMessage } from "@/chat/types";
import { Badge, Card, PageHeader, fmtDate } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin/auth";
import { connectDB } from "@/lib/db";
import { AssessmentSession } from "@/models/assessment";

export const dynamic = "force-dynamic";

const VIA_LABEL = { ai: "AI", builtin: "built-in", chip: "chip", guard: "safety reply" } as const;

export default async function Transcript({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  if (!/^[a-f0-9]{64}$/.test(id)) notFound();
  await connectDB();
  const s = await AssessmentSession.findOne({ _id: id, mode: "assisted" }).lean();
  if (!s) notFound();
  const messages = (s.chat?.messages ?? []) as ChatMessage[];
  const settings = (s.chat?.settings ?? {}) as Record<string, unknown>;
  const answers = (s.answers ?? {}) as Record<string, { values?: string[]; number?: number; text?: string }>;

  return (
    <>
      <Link href="/admin/assisted" className="mb-4 inline-flex items-center gap-1.5 text-sm text-teal-deep hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> All assisted assessments
      </Link>
      <PageHeader
        title="Typed answers"
        description={`${s.email ?? "No email"} · started ${fmtDate(s.createdAt)} · ${String(settings.mode ?? "?")} mode, ${String(settings.provider ?? "?")}${settings.provider === "groq" ? ` (${String(settings.model)})` : ""}`}
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Card title={messages.length ? `${messages.length / 2} typed answers` : "No typed answers — every question was answered by tapping"}>
          <ol className="space-y-3">
            {messages.map((m) => (
              <li key={m.id} className={m.role === "user" ? "flex justify-end" : "flex"}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === "user" ? "bg-forest text-white" : "bg-cream text-forest"}`}>
                  <p>{m.text}</p>
                  {m.lines && (
                    <ul className="mt-2 list-disc pl-4 text-xs">
                      {m.lines.map((l) => (
                        <li key={l}>{l}</li>
                      ))}
                    </ul>
                  )}
                  <p className={`mt-1 text-[10px] ${m.role === "user" ? "text-white/70" : "text-muted"}`}>
                    {fmtDate(m.at)}
                    {m.via ? ` · ${VIA_LABEL[m.via]}` : ""}
                    {m.kind && m.kind !== "question" ? ` · ${m.kind}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Extracted answers">
          <p className="mb-3">
            <Badge tone={s.status === "submitted" ? "good" : s.status === "stopped" ? "warn" : "info"}>{s.status}</Badge>
          </p>
          <dl className="space-y-2 text-xs">
            {Object.entries(answers).map(([k, a]) => (
              <div key={k}>
                <dt className="font-medium text-forest">{k}</dt>
                <dd className="text-muted">{a.values?.join(", ") ?? a.number ?? a.text}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
    </>
  );
}
