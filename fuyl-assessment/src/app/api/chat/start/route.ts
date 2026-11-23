import { z } from "zod";
import { CONSENT_VERSION } from "@/kb/copy";
import { fail, json, readJson, serverError } from "@/lib/api";
import { getAssistedSettings } from "@/lib/assisted";
import { snapshot } from "@/lib/chat";
import { getKnowledgeBase, isAssessmentLive } from "@/lib/kb";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { createSession } from "@/lib/session";

export const dynamic = "force-dynamic";

const utmField = z.string().trim().max(120).optional();
const StartBody = z.object({
  consent: z.literal(true, { errorMap: () => ({ message: "Please tick the box to continue." }) }),
  email: z.string().trim().toLowerCase().email("Please enter a valid email address.").max(200),
  utm: z.object({ source: utmField, medium: utmField, campaign: utmField, content: utmField, term: utmField }).partial().optional(),
});

/** Start an Assisted assessment: email first, then the same question cards as the standard one. */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`chat-start:${ip}`, 10, 10 * 60_000).ok) return fail("Too many attempts. Please wait a few minutes.", 429);
  const body = StartBody.safeParse(await readJson(req));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid request.", 422);
  if (!rateLimit(`chat-start-email:${body.data.email}`, 6, 24 * 3_600_000).ok) {
    return fail("You've started several assisted assessments today. Please continue your latest one, or try the standard assessment.", 429);
  }

  try {
    if (!(await isAssessmentLive())) return fail("The assessment isn't open yet. Please check back soon.", 503, { code: "NOT_LIVE" });
    const settings = await getAssistedSettings();
    if (!settings.enabled) return fail("The assisted assessment isn't available right now. Please try the standard one.", 503, { code: "DISABLED" });

    const kb = await getKnowledgeBase();
    await createSession({
      consentVersion: CONSENT_VERSION,
      kbVersion: kb.version,
      utm: body.data.utm,
      mode: "assisted",
      email: body.data.email,
      chat: { settings: snapshot(settings), messages: [], userTurns: 0, aiTurns: 0, fallbackTurns: 0 },
    });
    return json({ ok: true }, 201);
  } catch (err) {
    return serverError("chat:start", err);
  }
}
