import { nextStep } from "@/engine";
import { sha256 } from "@/lib/crypto";
import { connectDB } from "@/lib/db";
import { getKnowledgeBase } from "@/lib/kb";
import { joinSession, sessionAnswers } from "@/lib/session";
import { AssessmentSession } from "@/models/assessment";

export const dynamic = "force-dynamic";

/**
 * "Continue where you left off" link from the reminder email. Opens the saved
 * assessment in this browser (any device) and goes straight to the next
 * unanswered question — or the report, if it was finished in the meantime.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  // Relative redirect: stays on the exact host the link was opened on, so the new cookie is sent.
  const to = (path: string) => new Response(null, { status: 303, headers: { Location: path, "Cache-Control": "no-store" } });
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) return to("/?resume=expired");

  await connectDB();
  const s = await AssessmentSession.findOne({ resumeTokenHash: sha256(token) }, { status: 1, resultToken: 1, answers: 1 }).lean();
  if (!s) return to("/?resume=expired");
  if (s.status === "submitted" && s.resultToken) return to(`/result/${s.resultToken}`);

  await joinSession(s._id);
  const kb = await getKnowledgeBase();
  return to(nextStep(kb, sessionAnswers(s)).kind === "complete" ? "/summary" : "/q");
}
