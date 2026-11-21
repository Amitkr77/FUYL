import Link from "next/link";
import { Download } from "lucide-react";
import type { AssessmentResult } from "@/engine";
import { Badge, Card, Empty, PageHeader, btn, fmtDate, inputCls } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/admin/auth";
import { connectDB } from "@/lib/db";
import { Submission } from "@/models/assessment";

export const dynamic = "force-dynamic";
const PAGE = 25;
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default async function Submissions({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const admin = await requireAdminPage();
  const { q = "", page = "1" } = await searchParams;
  const p = Math.max(1, Number.parseInt(page) || 1);
  await connectDB();
  const filter = q.trim() ? { email: { $regex: escapeRe(q.trim().toLowerCase().slice(0, 100)) } } : {};
  const [rows, total] = await Promise.all([
    Submission.find(filter, { email: 1, firstName: 1, createdAt: 1, "result.areas.name": 1, "result.safety.level": 1, email_status: 1, ctaClickedAt: 1, newsletterOptIn: 1 })
      .sort({ createdAt: -1 })
      .skip((p - 1) * PAGE)
      .limit(PAGE)
      .lean(),
    Submission.countDocuments(filter),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <>
      <PageHeader
        title="Submissions"
        description="Completed assessments unlocked with an email. Contains personal and health data — handle with care. Deleted automatically after 12 months."
        actions={
          admin.role === "admin" ? (
            <a href={`/admin/export${q ? `?q=${encodeURIComponent(q)}` : ""}`} className={btn("secondary")}>
              <Download className="h-4 w-4" aria-hidden /> Export CSV
            </a>
          ) : undefined
        }
      />
      <form className="mb-4 flex max-w-md gap-2">
        <input name="q" defaultValue={q} placeholder="Search by email" className={inputCls} aria-label="Search by email" />
        <button className={btn("secondary")}>Search</button>
      </form>
      <Card>
        {rows.length === 0 ? (
          <Empty>{q ? "No matches." : "No submissions yet."}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs text-muted">
                <tr className="border-b border-line/60">
                  <th className="py-2 pr-3 font-medium">Date</th>
                  <th className="py-2 pr-3 font-medium">Name / email</th>
                  <th className="py-2 pr-3 font-medium">Focus areas</th>
                  <th className="py-2 pr-3 font-medium">Safety</th>
                  <th className="py-2 pr-3 font-medium">Email</th>
                  <th className="py-2 font-medium">Clicked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {rows.map((r) => {
                  const result = r.result as Pick<AssessmentResult, "areas" | "safety">;
                  const level = result?.safety?.level ?? "none";
                  return (
                    <tr key={String(r._id)} className="hover:bg-cream/40">
                      <td className="py-2.5 pr-3 text-xs text-muted">{fmtDate(r.createdAt)}</td>
                      <td className="py-2.5 pr-3">
                        <Link href={`/admin/submissions/${r._id}`} className="text-forest hover:underline">
                          {r.firstName ?? "—"}
                          <span className="block text-xs text-muted">{r.email}</span>
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-forest">{(result?.areas ?? []).map((a) => a.name).join(", ")}</td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={level === "stop" ? "bad" : level === "consult" ? "warn" : level === "none" ? "good" : "info"}>{level === "none" ? "—" : level}</Badge>
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={r.email_status === "sent" ? "good" : r.email_status === "failed" ? "bad" : "neutral"}>{r.email_status}</Badge>
                      </td>
                      <td className="py-2.5 text-xs">{r.ctaClickedAt ? "Yes" : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between text-xs text-muted">
          <span>
            {total} total · page {p} of {pages}
          </span>
          <span className="flex gap-2">
            {p > 1 && (
              <Link className={btn("secondary", "sm")} href={`?q=${encodeURIComponent(q)}&page=${p - 1}`}>
                Previous
              </Link>
            )}
            {p < pages && (
              <Link className={btn("secondary", "sm")} href={`?q=${encodeURIComponent(q)}&page=${p + 1}`}>
                Next
              </Link>
            )}
          </span>
        </div>
      </Card>
    </>
  );
}
