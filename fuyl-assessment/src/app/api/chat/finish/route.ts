import { fail, json, serverError } from "@/lib/api";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { loadSession } from "@/lib/session";
import { submitSession } from "@/lib/submit";

export const dynamic = "force-dynamic";

/** The user confirmed the recap: create the report and email it to the address given at the start. */
export async function POST(req: Request) {
  if (!rateLimit(`chat-finish:${clientIp(req)}`, 10, 10 * 60_000).ok) return fail("Too many attempts. Please wait a few minutes.", 429);
  try {
    const session = await loadSession();
    if (!session || session.mode !== "assisted" || !session.email) {
      return fail("Your chat has expired. Please start again.", 401, { code: "NO_SESSION" });
    }
    const r = await submitSession(session, session.email);
    if (!r.ok) return fail(r.error, r.status);
    return json({ token: r.token }, r.created ? 201 : 200);
  } catch (err) {
    return serverError("chat:finish", err);
  }
}
