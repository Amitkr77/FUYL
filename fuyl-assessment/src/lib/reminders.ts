import "server-only";
import { firstName, nextStep, prune } from "@/engine";
import { randomToken, sha256 } from "@/lib/crypto";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { getKnowledgeBase } from "@/lib/kb";
import { buildResumeEmail } from "@/lib/resumeEmail";
import { sessionAnswers } from "@/lib/session";
import { AssessmentSession } from "@/models/assessment";

/**
 * "Your answers are saved" reminders. Sessions that have an email (the
 * Assisted assessment asks for it first), answered at least one question, are
 * still unfinished, and have been quiet for REMINDER_IDLE_MINUTES get ONE
 * email with a link that reopens the assessment at the exact question — on
 * any device. Run from a scheduled job (/api/cron/reminders).
 */

const MAX_PER_RUN = 100;
/** Don't chase assessments abandoned more than a week ago. */
const MAX_AGE_DAYS = 7;
/** ~7 seconds a question, rounded up to whole minutes. */
const minutesFor = (questions: number) => Math.max(1, Math.ceil((questions * 7) / 60));

export interface ReminderRun {
  checked: number;
  sent: number;
  failed: number;
  skipped: number;
}

export async function sendResumeReminders(now = new Date()): Promise<ReminderRun> {
  const idle = env().REMINDER_IDLE_MINUTES;
  const kb = await getKnowledgeBase();
  const base = env().APP_URL.replace(/\/$/, "");
  const run: ReminderRun = { checked: 0, sent: 0, failed: 0, skipped: 0 };

  const candidates = await AssessmentSession.find(
    {
      status: "active",
      email: { $exists: true, $ne: null },
      reminderSentAt: { $exists: false },
      resultToken: { $exists: false },
      "path.0": { $exists: true },
      updatedAt: { $lte: new Date(now.getTime() - idle * 60_000), $gte: new Date(now.getTime() - MAX_AGE_DAYS * 86_400_000) },
    },
    { _id: 1 },
  )
    .sort({ updatedAt: 1 })
    .limit(MAX_PER_RUN)
    .lean();

  for (const c of candidates) {
    run.checked++;
    // Claim it atomically so overlapping runs never send twice.
    const token = randomToken(24);
    const s = await AssessmentSession.findOneAndUpdate(
      { _id: c._id, reminderSentAt: { $exists: false }, status: "active" },
      { $set: { reminderSentAt: now, resumeTokenHash: sha256(token) } },
      { new: true, timestamps: false },
    ).lean();
    if (!s?.email) {
      run.skipped++;
      continue;
    }
    const answers = prune(kb, sessionAnswers(s));
    const step = nextStep(kb, answers);
    if (step.kind !== "question") {
      run.skipped++;
      continue;
    }
    const mail = buildResumeEmail({
      name: firstName(kb, answers),
      percent: step.progress * 100,
      minutesLeft: minutesFor(step.remaining + 1),
      resumeUrl: `${base}/resume/${token}`,
    });
    const outcome = await sendEmail({ to: s.email, ...mail });
    if (outcome.status === "failed") run.failed++;
    else run.sent++;
  }
  return run;
}
