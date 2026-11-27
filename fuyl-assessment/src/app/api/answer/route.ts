import { z } from "zod";
import { nextStep } from "@/engine";
import { applyAnswer, insightFor } from "@/flow/state";
import { fail, json, readJson, serverError } from "@/lib/api";
import { getKnowledgeBase } from "@/lib/kb";
import { clientIp, rateLimitShared } from "@/lib/rateLimit";
import { checkPace } from "@/lib/humanCheck";
import { loadSession, sessionAnswers } from "@/lib/session";

export const dynamic = "force-dynamic";

const AnswerBody = z.object({
  key: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,59}$/),
  input: z.object({
    values: z.array(z.string().max(60)).max(20).optional(),
    number: z.union([z.number(), z.string().max(10)]).optional(),
    text: z.string().max(200).optional(),
    grid: z
      .record(z.string().max(60), z.string().max(60))
      .refine((g) => Object.keys(g).length <= 30)
      .optional(),
  }),
});

/** Answer the current question, or change an earlier answer. */
export async function POST(req: Request) {
  if (!(await rateLimitShared(`answer:${clientIp(req)}`, 240, 10 * 60_000)).ok) return fail("Too many requests. Please slow down.", 429);
  const body = AnswerBody.safeParse(await readJson(req));
  if (!body.success) return fail("Invalid answer.", 400);

  try {
    const session = await loadSession();
    if (!session) return fail("Your session has expired. Please start again.", 401, { code: "NO_SESSION" });
    if (session.status === "submitted") return fail("This assessment is finished. Start a new one to change answers.", 409, { code: "SUBMITTED" });

    const pace = checkPace(session);
    session.lastAnswerAt = new Date();
    session.fastStreak = pace.fastStreak;
    if (!pace.ok) {
      await session.save();
      return fail("Answers are coming in faster than a person can tap. Please slow down a little.", 429, { code: "TOO_FAST" });
    }

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
    return json({ state: r.state, insight: insightFor(kb, body.data.key, r.answers[body.data.key]) });
  } catch (err) {
    // Two answers raced (double-submit, or two tabs): the database's version
    // check rejected the later write, so nothing is corrupted. Tell the client
    // to reload the current state instead of reporting a server error.
    if (err instanceof Error && err.name === "VersionError") {
      return fail("Your answers were just updated in another tab or window. Loading the latest…", 409, { code: "STALE" });
    }
    return serverError("answer", err);
  }
}
