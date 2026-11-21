import { z } from "zod";
import { frontierView, type FlowState } from "@/flow/state";
import { fail, json, readJson, serverError } from "@/lib/api";
import { getKnowledgeBase, isAssessmentLive } from "@/lib/kb";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { createSession, loadSession, sessionAnswers } from "@/lib/session";
import { CONSENT_VERSION } from "@/kb/copy";

export const dynamic = "force-dynamic";

const utmField = z.string().trim().max(120).optional();
const StartBody = z.object({
  consent: z.literal(true, { errorMap: () => ({ message: "Please agree to continue." }) }),
  utm: z.object({ source: utmField, medium: utmField, campaign: utmField, content: utmField, term: utmField }).partial().optional(),
});

/** Resume: current state of this browser's session (or `null` if none). */
export async function GET() {
  try {
    const session = await loadSession();
    if (!session || session.status === "submitted") return json({ state: null });
    const kb = await getKnowledgeBase();
    const answers = sessionAnswers(session);
    const state: FlowState = { view: frontierView(kb, answers, session.path), path: session.path };
    return json({ state });
  } catch (err) {
    return serverError("session:get", err);
  }
}

/** Start a new assessment after consent. */
export async function POST(req: Request) {
  if (!rateLimit(`start:${clientIp(req)}`, 20, 10 * 60_000).ok) return fail("Too many attempts. Please wait a few minutes.", 429);
  const body = StartBody.safeParse(await readJson(req));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid request.", 400);
  try {
    if (!(await isAssessmentLive())) return fail("The assessment isn't open yet. Please check back soon.", 503, { code: "NOT_LIVE" });
    const kb = await getKnowledgeBase();
    await createSession({ consentVersion: CONSENT_VERSION, kbVersion: kb.version, utm: body.data.utm });
    const state: FlowState = { view: frontierView(kb, {}, []), path: [] };
    return json({ state }, 201);
  } catch (err) {
    return serverError("session:post", err);
  }
}
