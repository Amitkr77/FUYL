import "server-only";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/** Scheduled jobs call with `Authorization: Bearer <CRON_SECRET>` (Vercel Cron sends it automatically). */
export function cronAuthorised(req: Request): boolean {
  const secret = env().CRON_SECRET;
  if (!secret) return false; // no secret configured → endpoints disabled
  const header = req.headers.get("authorization") ?? "";
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ""));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
