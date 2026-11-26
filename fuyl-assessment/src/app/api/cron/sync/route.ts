import { cronAuthorised as authorised } from "@/lib/cron";
import { runSync } from "@/sync/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled sync from fuyl.in. Call daily with `Authorization: Bearer <CRON_SECRET>`.
 * (GET for schedulers that only support GET, e.g. Vercel Cron; POST for others.)
 */
async function handle(req: Request) {
  if (!authorised(req)) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const summary = await runSync("cron");
    return Response.json({ ok: summary.status !== "failed", ...summary }, { status: summary.status === "failed" ? 502 : 200 });
  } catch (err) {
    console.error("[sync] failed", err);
    return Response.json({ ok: false, error: "Sync failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
