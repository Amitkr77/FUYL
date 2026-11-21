import { questionView } from "@/flow/state";
import { fail, json, serverError } from "@/lib/api";
import { getKnowledgeBase } from "@/lib/kb";
import { loadSession, sessionAnswers } from "@/lib/session";

export const dynamic = "force-dynamic";

/** An answered question (for Back / Edit), pre-filled with the saved answer. */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!key || !/^[a-z0-9][a-z0-9_-]{0,59}$/.test(key)) return fail("Missing question.", 400);
  try {
    const session = await loadSession();
    if (!session) return fail("Your session has expired. Please start again.", 401, { code: "NO_SESSION" });
    const kb = await getKnowledgeBase();
    const view = questionView(kb, sessionAnswers(session), session.path, key);
    if (!view) return fail("That question isn't available.", 404);
    return json({ state: { view, path: session.path } });
  } catch (err) {
    return serverError("question", err);
  }
}
