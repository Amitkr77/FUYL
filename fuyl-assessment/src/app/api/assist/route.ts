import { z } from "zod";
import { nextStep } from "@/engine";
import { assistTurn } from "@/chat/turn";
import { MAX_MESSAGE_CHARS, MAX_USER_TURNS, chatMessage, type ChatMessage } from "@/chat/types";
import { fail, json, readJson, serverError } from "@/lib/api";
import { recordAiUsage } from "@/lib/assisted";
import { aiFor, type ChatSettings } from "@/lib/chat";
import { getKnowledgeBase } from "@/lib/kb";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { loadSession, sessionAnswers } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Body = z.object({
  key: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,59}$/),
  text: z
    .string()
    .trim()
    .min(1, "Type your answer first.")
    .max(MAX_MESSAGE_CHARS, `Please keep it under ${MAX_MESSAGE_CHARS} characters.`),
});

/**
 * Assisted assessment: answer the question on screen in your own words.
 * Returns the next view (like /api/answer) — or a gentle follow-up when the
 * answer wasn't clear, leaving the question in place.
 */
export async function POST(req: Request) {
  if (!rateLimit(`assist:${clientIp(req)}`, 120, 10 * 60_000).ok) return fail("You're going very quickly. Please wait a moment.", 429);
  const body = Body.safeParse(await readJson(req));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid answer.", 400);

  try {
    const session = await loadSession();
    if (!session) return fail("Your session has expired. Please start again.", 401, { code: "NO_SESSION" });
    if (session.mode !== "assisted" || !session.chat) return fail("Typed answers are only available in the assisted assessment.", 403);
    if (session.status === "submitted") return fail("This assessment is finished. Start a new one to change answers.", 409, { code: "SUBMITTED" });
    if ((session.chat.userTurns ?? 0) >= MAX_USER_TURNS) {
      return fail("You've typed a lot of answers — please tap one of the options to continue.", 429, { code: "TURN_LIMIT" });
    }

    const kb = await getKnowledgeBase();
    const settings = (session.chat.settings ?? {}) as Partial<ChatSettings>;
    const r = await assistTurn(
      { kb, mode: settings.mode === "full" ? "full" : "hybrid", ai: aiFor(settings), answers: sessionAnswers(session), path: session.path },
      body.data.key,
      body.data.text,
    );
    if (r.aiFailed) await recordAiUsage({ fallback: true }).catch(() => {});

    // Transcript for the admin view.
    const log: ChatMessage[] = [
      chatMessage({ role: "user", text: body.data.text, questionKey: body.data.key }),
      r.ok
        ? chatMessage({ role: "assistant", kind: "ack", via: r.via, questionKey: body.data.key, text: [r.ack, `Understood: ${r.understood.join(" · ")}`].filter(Boolean).join(" ") })
        : chatMessage({ role: "assistant", kind: "clarify", via: r.via, questionKey: body.data.key, text: r.clarify }),
    ];
    session.chat.messages = [...((session.chat.messages ?? []) as ChatMessage[]), ...log].slice(-300);
    session.chat.userTurns = (session.chat.userTurns ?? 0) + 1;
    if (r.via === "ai") session.chat.aiTurns = (session.chat.aiTurns ?? 0) + 1;
    if (r.aiFailed) session.chat.fallbackTurns = (session.chat.fallbackTurns ?? 0) + 1;
    session.markModified("chat");

    if (!r.ok) {
      await session.save();
      if (r.status === 409) return fail(r.clarify, 409);
      return json({ clarify: r.clarify });
    }

    session.answers = r.answers;
    session.markModified("answers");
    session.path = r.path;
    session.kbVersion = kb.version;
    const step = nextStep(kb, r.answers);
    session.status = step.kind === "stopped" ? "stopped" : step.kind === "complete" ? "complete" : "active";
    session.stoppedRule = step.kind === "stopped" ? step.rule.key : undefined;
    if (step.kind === "complete") session.completedAt ??= new Date();
    await session.save();
    return json({ state: r.state, ack: r.ack, understood: r.understood });
  } catch (err) {
    if (err instanceof Error && err.name === "VersionError") {
      return fail("Your answers were just updated in another tab or window. Loading the latest…", 409, { code: "STALE" });
    }
    return serverError("assist", err);
  }
}
