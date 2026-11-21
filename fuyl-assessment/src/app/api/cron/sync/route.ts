import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";
import { runSync } from "@/sync/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(req: Request): boolean {
  const secret = env().CRON_SECRET;
  if (!secret) return false; // no secret configured → endpoint disabled
  const header = req.headers.get("authorization") ?? "";
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

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
