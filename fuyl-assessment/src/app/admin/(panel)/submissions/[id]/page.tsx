import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { Answers, AssessmentResult } from "@/engine";
import { ActionButton } from "@/components/admin/ActionButton";
import { Badge, Card, PageHeader, fmtDate } from "@/components/admin/ui";
import { deleteSubmissionAction } from "@/app/admin/actions";
import { audit, requireAdminPage } from "@/lib/admin/auth";
import { getKnowledgeBase } from "@/lib/kb";
import { connectDB } from "@/lib/db";
import { Submission } from "@/models/assessment";

export const dynamic = "force-dynamic";

export default async function SubmissionDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPage();
  const { id } = await params;
  if (!/^[a-f0-9]{24}$/.test(id)) notFound();
  await connectDB();
  const doc = await Submission.findById(id).lean();
  if (!doc) notFound();
  await audit(admin.email, "submission.view", id);

  const result = doc.result as AssessmentResult;
  const answers = doc.answers as Answers;
  const kb = await getKnowledgeBase();
  const qByKey = new Map(kb.questions.map((q) => [q.key, q]));
  const label = (key: string) => {
    const a = answers[key];
    const q = qByKey.get(key);
    if (a?.text) return a.text;
    if (typeof a?.number === "number") return String(a.number);
    return (a?.values ?? []).map((v) => q?.options?.find((o) => o.value === v)?.label ?? v).join(", ");
  };

  return (
    <>
      <Link href="/admin/submissions" className="mb-3 inline-flex items-center gap-1 text-sm text-teal-deep hover:underline">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> All submissions
      </Link>
      <PageHeader
        title={doc.firstName ?? doc.email}
        description={`${doc.email} · ${fmtDate(doc.createdAt)} · knowledge base v${doc.kbVersion}`}
        actions={
          admin.role === "admin" ? (
            <ActionButton
              variant="danger"
              label="Delete (erasure request)"
              confirmText="Permanently delete this submission and its health data?"
              action={async () => {
                "use server";
                const r = await deleteSubmissionAction(id);
                if (r.ok) redirect("/admin/submissions");
                return r;
              }}
            />
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Result">
          <div className="space-y-3">
            {result.areas.map((a) => (
              <div key={a.key}>
                <p className="text-sm font-medium text-forest">
                  {a.name} <Badge tone="info">{a.level} · {a.match}%</Badge>
                </p>
                <p className="text-xs text-muted">{a.ingredients.map((i) => i.name).join(", ")}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-line/50 pt-3">
            <p className="text-xs font-medium text-forest">Safety: {result.safety.level}</p>
            <ul className="mt-1 space-y-1 text-xs text-muted">
              {result.safety.notes.map((n) => (
                <li key={n.key}>
                  {n.title} ({n.level})
                </li>
              ))}
            </ul>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-line/50 pt-3 text-xs">
            <dt className="text-muted">Report email</dt>
            <dd className="text-forest">{doc.email_status}{doc.email_error ? ` — ${doc.email_error}` : ""}</dd>
            <dt className="text-muted">Clicked to fuyl.in</dt>
            <dd className="text-forest">{doc.ctaClickedAt ? fmtDate(doc.ctaClickedAt) : "No"}</dd>
            <dt className="text-muted">Newsletter opt-in</dt>
            <dd className="text-forest">{doc.newsletterOptIn ? "Yes" : "No"}</dd>
            <dt className="text-muted">Source</dt>
            <dd className="text-forest">{[doc.utm?.source, doc.utm?.campaign].filter(Boolean).join(" / ") || "—"}</dd>
            <dt className="text-muted">Consent</dt>
            <dd className="text-forest">{doc.consent?.version ?? "—"}</dd>
          </dl>
        </Card>

        <Card title={`Answers (${doc.path?.length ?? Object.keys(answers).length})`}>
          <ol className="divide-y divide-line/40 text-sm">
            {(doc.path?.length ? doc.path : Object.keys(answers)).map((k) => (
              <li key={k} className="py-2">
                <p className="text-xs text-muted">{qByKey.get(k)?.prompt.replace(/\{name\},?\s*/g, "") ?? k}</p>
                <p className="text-forest">{label(k)}</p>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
