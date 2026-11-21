import { z } from "zod";
import { buildResult, nextStep } from "@/engine";
import { fail, json, readJson, serverError } from "@/lib/api";
import { randomToken, sha256 } from "@/lib/crypto";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { getKnowledgeBase, getProduct, productLink } from "@/lib/kb";
import { clientIp, rateLimit } from "@/lib/rateLimit";
import { buildReportEmail } from "@/lib/reportEmail";
import { loadSession, sessionAnswers } from "@/lib/session";
import { SUBMISSION_TTL_DAYS, Submission, daysFromNow } from "@/models/assessment";

export const dynamic = "force-dynamic";

const UnlockBody = z.object({
  email: z.string().trim().toLowerCase().email("Please enter a valid email address.").max(200),
  newsletter: z.boolean().optional().default(false),
});

/**
 * Email gate: store the finished assessment, email the report, and return the
 * result-page token. The result is shown immediately — no verification step.
 */
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (!rateLimit(`unlock:${ip}`, 8, 10 * 60_000).ok) return fail("Too many attempts. Please wait a few minutes.", 429);
  const body = UnlockBody.safeParse(await readJson(req));
  if (!body.success) return fail(body.error.issues[0]?.message ?? "Invalid request.", 422);

  try {
    const session = await loadSession();
    if (!session) return fail("Your session has expired. Please start again.", 401, { code: "NO_SESSION" });
    if (session.status === "submitted" && session.resultToken) return json({ token: session.resultToken });

    const kb = await getKnowledgeBase();
    const answers = sessionAnswers(session);
    if (nextStep(kb, answers).kind !== "complete") return fail("Please finish the assessment first.", 409);

    const [result, product] = [buildResult(kb, answers), await getProduct()];
    const token = randomToken(24);
    const { APP_URL } = env();
    const resultUrl = `${APP_URL.replace(/\/$/, "")}/result/${token}`;

    const submission = await Submission.create({
      tokenHash: sha256(token),
      sessionId: session._id,
      email: body.data.email,
      firstName: result.name,
      newsletterOptIn: body.data.newsletter,
      consent: session.consent,
      answers,
      path: session.path,
      result,
      product,
      kbVersion: kb.version,
      utm: session.utm,
      expiresAt: daysFromNow(SUBMISSION_TTL_DAYS),
    });

    session.status = "submitted";
    session.submittedAt = new Date();
    session.resultToken = token;
    await session.save();

    // Email failures never block the result page; the outcome is recorded.
    const email = buildReportEmail({
      result,
      resultUrl,
      productUrl: productLink(product.url, "email"),
      productTitle: product.title,
      priceFrom: product.priceFrom,
    });
    const outcome = await sendEmail({ to: body.data.email, ...email });
    await Submission.updateOne(
      { _id: submission._id },
      { $set: { email_status: outcome.status, ...(outcome.status === "failed" ? { email_error: outcome.error } : {}) } },
    );

    return json({ token }, 201);
  } catch (err) {
    return serverError("unlock", err);
  }
}
