import { z } from "zod";
import { nextStep } from "@/engine";
import { applyAnswer } from "@/flow/state";
import { fail, json, readJson, serverError } from "@/lib/api";
import { getKnowledgeBase } from "@/lib/kb";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { loadSession, sessionAnswers } from "@/lib/session";

export const dynamic = "force-dynamic";

const AnswerBody = z.object({
  key: z.string().min(1).max(60),
  input: z.object({
    values: z.array(z.string().max(60)).max(20).optional(),
    number: z.union([z.number(), z.string().max(10)]).optional(),
    text: z.string().max(200).optional(),
  }),
});

/** Answer the current question, or change an earlier answer. */
export async function POST(req: Request) {
  if (!rateLimit(`answer:${clientIp(req)}`, 240, 10 * 60_000).ok) return fail("Too many requests. Please slow down.", 429);
  const body = AnswerBody.safeParse(await readJson(req));
  if (!body.success) return fail("Invalid answer.", 400);

  try {
    const session = await loadSession();
    if (!session) return fail("Your session has expired. Please start again.", 401, { code: "NO_SESSION" });
    if (session.status === "submitted") return fail("This assessment is finished. Start a new one to change answers.", 409, { code: "SUBMITTED" });

    const kb = await getKnowledgeBase();
    const r = applyAnswer(kb, sessionAnswers(session), session.path, body.data.key, body.data.input);
    if (!r.ok) return fail(r.error, r.status);

    session.answers = r.answers;
    session.markModified("answers");
    session.path = r.path;
    session.kbVersion = kb.version;
    // Status follows the frontier, not the view: after an edit the user may be
    // looking at an earlier question while the assessment is already complete.
    // Recomputed every time so a stop can be undone (e.g. a mistyped age).
    const step = nextStep(kb, r.answers);
    session.status = step.kind === "stopped" ? "stopped" : step.kind === "complete" ? "complete" : "active";
    session.stoppedRule = step.kind === "stopped" ? step.rule.key : undefined;
    if (step.kind === "complete") session.completedAt ??= new Date();
    await session.save();
    return json({ state: r.state });
  } catch (err) {
    return serverError("answer", err);
  }
}
