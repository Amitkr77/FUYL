import { cronAuthorised } from "@/lib/cron";
import { connectDB } from "@/lib/db";
import { sendResumeReminders } from "@/lib/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sends the one "your answers are saved — continue" email to assisted
 * assessments that went quiet midway. Call on a schedule (hourly is ideal)
 * with `Authorization: Bearer <CRON_SECRET>`.
 */
async function handle(req: Request) {
  if (!cronAuthorised(req)) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    await connectDB();
    const run = await sendResumeReminders();
    return Response.json({ ok: true, ...run });
  } catch (err) {
    console.error("[reminders] failed", err);
    return Response.json({ ok: false, error: "Reminder run failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
