import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { AssessmentResult } from "@/engine";
import { DISCLAIMER, SUPPORT } from "@/kb/copy";
import { sha256 } from "@/lib/crypto";
import { connectDB } from "@/lib/db";
import { getProduct } from "@/lib/kb";
import { ReportPdf } from "@/lib/pdf/ReportPdf";
import { clientIp, rateLimitShared } from "@/lib/rateLimit";
import { Submission } from "@/models/assessment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/** Download the report as a real PDF (generated on the server). Same secret link as the report page. */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return new Response("Not found", { status: 404 });
  if (!(await rateLimitShared(`pdf:${clientIp(req)}`, 20, 10 * 60_000)).ok) return new Response("Too many downloads. Please wait a few minutes.", { status: 429 });

  await connectDB();
  const doc = await Submission.findOne({ tokenHash: sha256(token) }, { result: 1, createdAt: 1 }).lean();
  if (!doc) return new Response("Not found", { status: 404 });

  const result = doc.result as AssessmentResult;
  const product = await getProduct();
  const pdf = await renderToBuffer(
    createElement(ReportPdf, {
      result,
      createdAt: new Date(doc.createdAt as Date),
      productTitle: product.title,
      productUrl: product.url,
      disclaimer: DISCLAIMER,
      support: { email: SUPPORT.email, phone: SUPPORT.phone },
    }) as Parameters<typeof renderToBuffer>[0],
  );

  const file = `FUYL-report${result.name ? `-${result.name.replace(/[^\p{L}\p{N}]+/gu, "-")}` : ""}.pdf`;
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(file).replace(/%2D/g, "-")}"; filename*=UTF-8''${encodeURIComponent(file)}`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
