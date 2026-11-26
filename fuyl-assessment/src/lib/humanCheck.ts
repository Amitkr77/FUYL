import "server-only";
import { env } from "@/lib/env";

/**
 * Human checks for the actions bots abuse most (starting an assessment,
 * unlocking/emailing a report):
 *
 *  - Honeypot: a hidden form field people never see or fill. Bots that fill
 *    every field give themselves away.
 *  - Cloudflare Turnstile: a free, privacy-friendly "are you human" check that
 *    is invisible for almost everyone. Enforced only when TURNSTILE_SECRET_KEY
 *    is set. If Cloudflare itself can't be reached we let the request through
 *    (and log it) rather than lock real people out — rate limits still apply.
 */

export type HumanVerdict = { ok: true } | { ok: false; error: string };

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyHuman(input: { hp?: unknown; human?: unknown; ip: string; action: string }): Promise<HumanVerdict> {
  if (typeof input.hp === "string" && input.hp.trim() !== "") return { ok: false, error: "Invalid request." };

  const secret = env().TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true };
  const token = typeof input.human === "string" ? input.human : "";
  if (!token || token.length > 2048) return { ok: false, error: "Please complete the quick human check and try again." };

  try {
    const body = new URLSearchParams({ secret, response: token, ...(input.ip && input.ip !== "unknown" ? { remoteip: input.ip } : {}) });
    const res = await fetch(SITEVERIFY, { method: "POST", body, signal: AbortSignal.timeout(8000), cache: "no-store" });
    const data = (await res.json()) as { success?: boolean; action?: string; "error-codes"?: string[] };
    if (!data.success) return { ok: false, error: "The human check failed or expired. Please try again." };
    if (data.action && data.action !== input.action) return { ok: false, error: "The human check failed. Please try again." };
    return { ok: true };
  } catch (err) {
    console.warn("[turnstile] verification unavailable, allowing request", err instanceof Error ? err.message : err);
    return { ok: true };
  }
}

/**
 * Answers arriving faster than a person can read and tap (a script looping
 * the API) are refused after a short streak. Humans need well over a second
 * per question; the single-choice tap alone has a deliberate 260 ms beat.
 */
export const PACE = { minGapMs: 400, maxFastStreak: 4 } as const;

export function checkPace(session: { lastAnswerAt?: Date | null; fastStreak?: number | null }, now = new Date()): { ok: boolean; fastStreak: number } {
  if (process.env.ALLOW_AUTOMATION === "true") return { ok: true, fastStreak: 0 };
  const last = session.lastAnswerAt ? new Date(session.lastAnswerAt).getTime() : 0;
  const fast = last > 0 && now.getTime() - last < PACE.minGapMs;
  const fastStreak = fast ? (session.fastStreak ?? 0) + 1 : 0;
  return { ok: fastStreak < PACE.maxFastStreak, fastStreak };
}
