import type { AssessmentResult } from "@/engine";
import { AdminAuthError, audit, requireAdmin } from "@/lib/admin/auth";
import { toCsv } from "@/lib/admin/csv";
import { connectDB } from "@/lib/db";
import { Submission } from "@/models/assessment";

export const dynamic = "force-dynamic";
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** CSV export of submissions — admins only (contains personal + health data). Audit-logged. */
export async function GET(req: Request) {
  let admin;
  try {
    admin = await requireAdmin(["admin"]);
  } catch (err) {
    return new Response(err instanceof AdminAuthError ? err.message : "Forbidden", { status: 403 });
  }
  const q = new URL(req.url).searchParams.get("q")?.trim().toLowerCase().slice(0, 100);
  await connectDB();
  const rows = await Submission.find(q ? { email: { $regex: escapeRe(q) } } : {})
    .sort({ createdAt: -1 })
    .limit(50_000)
    .lean();

  const csv = toCsv(
    ["created_at", "first_name", "email", "newsletter_opt_in", "focus_areas", "wellness_score", "safety_level", "email_status", "clicked_to_store", "utm_source", "utm_campaign", "kb_version"],
    rows.map((r) => {
      const result = r.result as AssessmentResult;
      return [
        r.createdAt,
        r.firstName,
        r.email,
        r.newsletterOptIn ? "yes" : "no",
        result?.areas?.map((a) => a.name).join("; "),
        result?.wellness?.score,
        result?.safety?.level,
        r.email_status,
        r.ctaClickedAt ? "yes" : "no",
        r.utm?.source,
        r.utm?.campaign,
        r.kbVersion,
      ];
    }),
  );
  await audit(admin.email, "submission.export", undefined, { count: rows.length, q });
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fuyl-assessment-submissions-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
