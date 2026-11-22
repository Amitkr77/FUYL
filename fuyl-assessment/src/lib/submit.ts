import "server-only";
import { buildResult, nextStep } from "@/engine";
import { randomToken, sha256 } from "@/lib/crypto";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { getKnowledgeBase, getProduct, productLink } from "@/lib/kb";
import { buildReportEmail } from "@/lib/reportEmail";
import { sessionAnswers } from "@/lib/session";
import { AssessmentSession, SUBMISSION_TTL_DAYS, Submission, daysFromNow, type SessionDoc } from "@/models/assessment";

/** Report emails to one address per 24 hours (protects strangers' inboxes and the SMTP quota). */
export const MAX_REPORT_EMAILS_PER_DAY = 3;

export type SubmitOutcome = { ok: true; token: string; created: boolean } | { ok: false; error: string; status: number };

/**
 * Finish an assessment: store the submission, email the report and return the
 * result-page token. Shared by the quiz's email gate and the chat. Idempotent —
 * a second call (double-click, parallel request) returns the same token.
 */
export async function submitSession(
  session: { _id: string; resultToken?: string | null } & Pick<SessionDoc, "answers" | "path" | "consent" | "utm" | "mode">,
  email: string,
  newsletter = false,
): Promise<SubmitOutcome> {
  if (session.resultToken) return { ok: true, token: session.resultToken, created: false };

  const kb = await getKnowledgeBase();
  const answers = sessionAnswers(session);
  if (nextStep(kb, answers).kind !== "complete") return { ok: false, error: "Please finish the assessment first.", status: 409 };

  // Claim the session atomically BEFORE creating anything, so a double-click
  // (or parallel requests) yields exactly one report and one email — the
  // other request just gets the same link.
  const token = randomToken(24);
  const claimed = await AssessmentSession.findOneAndUpdate(
    { _id: session._id, resultToken: { $exists: false } },
    { $set: { status: "submitted", submittedAt: new Date(), resultToken: token } },
    { new: true },
  );
  if (!claimed) {
    const current = await AssessmentSession.findById(session._id, { resultToken: 1 }).lean();
    return current?.resultToken ? { ok: true, token: current.resultToken, created: false } : { ok: false, error: "Please try again.", status: 409 };
  }

  const [result, product] = [buildResult(kb, answers), await getProduct()];
  const resultUrl = `${env().APP_URL.replace(/\/$/, "")}/result/${token}`;

  const submission = await Submission.create({
    tokenHash: sha256(token),
    sessionId: session._id,
    email,
    firstName: result.name,
    newsletterOptIn: newsletter,
    consent: session.consent,
    answers,
    path: session.path,
    result,
    product,
    kbVersion: kb.version,
    utm: session.utm,
    mode: session.mode ?? "standard",
    expiresAt: daysFromNow(SUBMISSION_TTL_DAYS),
  });

  // Over the per-recipient cap the report is still shown — just not emailed.
  const recentForAddress = await Submission.countDocuments({
    email,
    _id: { $ne: submission._id },
    createdAt: { $gte: new Date(Date.now() - 86_400_000) },
    email_status: { $in: ["sent", "pending", "failed"] },
  });
  if (recentForAddress >= MAX_REPORT_EMAILS_PER_DAY) {
    await Submission.updateOne({ _id: submission._id }, { $set: { email_status: "limited" } });
    return { ok: true, token, created: true };
  }

  // Email failures never block the result page; the outcome is recorded.
  const mail = buildReportEmail({
    result,
    resultUrl,
    productUrl: productLink(product.url, "email"),
    productTitle: product.title,
    priceFrom: product.priceFrom,
  });
  const outcome = await sendEmail({ to: email, ...mail });
  await Submission.updateOne(
    { _id: submission._id },
    { $set: { email_status: outcome.status, ...(outcome.status === "failed" ? { email_error: outcome.error } : {}) } },
  );
  return { ok: true, token, created: true };
}
