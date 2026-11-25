import { z } from "zod";
import { fail, json, readJson, serverError } from "@/lib/api";
import { clientIp, rateLimitShared } from "@/lib/rateLimit";
import { verifyHuman } from "@/lib/humanCheck";
import { loadSession } from "@/lib/session";
import { submitSession } from "@/lib/submit";

export const dynamic = "force-dynamic";

const UnlockBody = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address.").max(200),
  newsletter: z.boolean().optional().default(false),
  hp: z.string().max(200).optional(),
  human: z.string().max(2048).optional(),
});

/**
 * Email gate: store the finished assessment, email the report, and return the
 * result-page token. The result is shown immediately — no verification step.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!(await rateLimitShared(`unlock:${ip}`, 8, 10 * 60_000)).ok) return fail("Too many attempts. Please wait a few minutes.", 429);
  const body = UnlockBody.safeParse(await readJson(req));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid request.", 422);
  const human = await verifyHuman({ hp: body.data.hp, human: body.data.human, ip, action: "unlock" });
  if (!human.ok) return fail(human.error, 403, { code: "HUMAN_CHECK" });

  try {
    const session = await loadSession();
    if (!session) return fail("Your session has expired. Please start again.", 401, { code: "NO_SESSION" });
    const r = await submitSession(session, body.data.email, body.data.newsletter);
    if (!r.ok) return fail(r.error, r.status);
    return json({ token: r.token }, r.created ? 201 : 200);
  } catch (err) {
    return serverError("unlock", err);
  }
}
