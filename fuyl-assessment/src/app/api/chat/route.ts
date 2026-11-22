import { z } from "zod";
import { nextStep } from "@/engine";
import { runTurn } from "@/chat/turn";
import { MAX_MESSAGE_CHARS, MAX_USER_TURNS, type ChatMessage, type TurnInput } from "@/chat/types";
import { message } from "@/chat/script";
import { fail, json, readJson, serverError } from "@/lib/api";
import { recordAiUsage } from "@/lib/assisted";
import { aiFor, chatView, type ChatSettings } from "@/lib/chat";
import { getKnowledgeBase } from "@/lib/kb";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { loadSession, sessionAnswers } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SendBody = z.union([
  z.object({
    text: z
      .string()
      .trim()
      .min(1, "Type a reply first.")
      .max(MAX_MESSAGE_CHARS, `Please keep it under ${MAX_MESSAGE_CHARS} characters.`),
  }),
  z.object({
    choice: z.object({
      key: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,59}$/),
      values: z.array(z.string().max(60)).max(20).optional(),
      number: z.number().optional(),
    }),
  }),
]);

/** Resume: the current chat in this browser (or null). */
export async function GET() {
  try {
    const session = await loadSession();
    if (!session || session.mode !== "assisted") return json({ chat: null });
    return json({ chat: await chatView(session) });
  } catch (err) {
    return serverError("chat:get", err);
  }
}

/** Send a message or tap a suggestion. */
export async function POST(req: Request) {
  if (!rateLimit(`chat:${clientIp(req)}`, 120, 10 * 60_000).ok) return fail("You're sending messages very quickly. Please wait a moment.", 429);
  const body = SendBody.safeParse(await readJson(req));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid message.", 400);

  try {
    const session = await loadSession();
    if (!session || session.mode !== "assisted" || !session.chat) return fail("Your chat has expired. Please start again.", 401, { code: "NO_SESSION" });
    if (session.status === "submitted") return fail("This chat is finished. Your results are ready.", 409, { code: "SUBMITTED" });
    if ((session.chat.userTurns ?? 0) >= MAX_USER_TURNS) {
      return fail("This chat has reached its message limit. Please finish with the standard assessment.", 429, { code: "TURN_LIMIT" });
    }

    const kb = await getKnowledgeBase();
    const answers = sessionAnswers(session);
    if (nextStep(kb, answers).kind !== "question") return json({ chat: await chatView(session) });

    const settings = (session.chat.settings ?? {}) as ChatSettings;
    const history = (session.chat.messages ?? []) as ChatMessage[];
    let input: TurnInput;
    let userText: string;
    if ("text" in body.data) {
      input = { kind: "text", text: body.data.text };
      userText = body.data.text;
    } else {
      const c = body.data.choice;
      input = { kind: "choice", key: c.key, input: { values: c.values, number: c.number } };
      const q = kb.questions.find((x) => x.key === c.key);
      userText = c.values?.length
        ? c.values.map((v) => q?.options?.find((o) => o.value === v)?.label ?? v).join(", ")
        : String(c.number ?? "");
    }
    const userMsg = message({ role: "user", text: userText, via: "text" in body.data ? undefined : "chip" });

    const r = await runTurn(
      {
        kb,
        mode: settings.mode === "full" ? "full" : "hybrid",
        ai: aiFor(settings),
        answers,
        path: session.path,
        askKey: session.chat.askKey ?? undefined,
        history: [...history, userMsg],
      },
      input,
    );
    if (r.aiFailed) await recordAiUsage({ fallback: true }).catch(() => {});

    session.answers = r.answers;
    session.markModified("answers");
    session.path = r.path;
    session.kbVersion = kb.version;
    session.chat.messages = [...history, userMsg, ...r.add].slice(-300);
    session.chat.askKey = r.askKey;
    session.chat.userTurns = (session.chat.userTurns ?? 0) + 1;
    if (r.via === "ai") session.chat.aiTurns = (session.chat.aiTurns ?? 0) + 1;
    if (r.aiFailed) session.chat.fallbackTurns = (session.chat.fallbackTurns ?? 0) + 1;
    session.markModified("chat");
    const step = nextStep(kb, r.answers);
    session.status = step.kind === "stopped" ? "stopped" : step.kind === "complete" ? "complete" : "active";
    session.stoppedRule = step.kind === "stopped" ? step.rule.key : undefined;
    if (step.kind === "complete") session.completedAt ??= new Date();
    await session.save();
    return json({ chat: await chatView(session) });
  } catch (err) {
    if (err instanceof Error && err.name === "VersionError") {
      return fail("This chat was just updated in another tab. Loading the latest…", 409, { code: "STALE" });
    }
    return serverError("chat:post", err);
  }
}
