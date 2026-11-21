import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

/**
 * Pure helpers for one-time sign-in codes (no database), so they can be unit
 * tested. Codes are 6 random digits; only an HMAC keyed with the server secret
 * is stored, bound to the email so a code can't be replayed for another user.
 */
export const OTP_LENGTH = 6;
export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_SECONDS = 60;
export const OTP_MAX_PER_HOUR = 5;

export type ThrottleState = { lastAt: Date; windowStart: Date; count: number } | null;
export type ThrottleDecision =
  | { ok: true; next: { lastAt: Date; windowStart: Date; count: number } }
  | { ok: false; error: string; retryAfter: number };

/** Pure throttle rule: 60 s between codes and at most OTP_MAX_PER_HOUR per hour, per email. */
export function decideThrottle(state: ThrottleState, now = new Date()): ThrottleDecision {
  if (state) {
    const sinceLast = (now.getTime() - state.lastAt.getTime()) / 1000;
    if (sinceLast < OTP_RESEND_SECONDS) {
      const retryAfter = Math.ceil(OTP_RESEND_SECONDS - sinceLast);
      return { ok: false, error: `Please wait ${retryAfter}s before requesting another code.`, retryAfter };
    }
    const inWindow = now.getTime() - state.windowStart.getTime() < 3_600_000;
    if (inWindow && state.count >= OTP_MAX_PER_HOUR) {
      const retryAfter = Math.ceil((state.windowStart.getTime() + 3_600_000 - now.getTime()) / 1000);
      return { ok: false, error: "Too many codes requested for this email. Please try again later.", retryAfter };
    }
    if (inWindow) return { ok: true, next: { lastAt: now, windowStart: state.windowStart, count: state.count + 1 } };
  }
  return { ok: true, next: { lastAt: now, windowStart: now, count: 1 } };
}

export function generateCode(): string {
  return randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

export function hashCode(email: string, code: string, secret: string): string {
  return createHmac("sha256", secret).update(`${email.trim().toLowerCase()}:${code}`).digest("hex");
}

export function codeMatches(email: string, code: string, storedHash: string, secret: string): boolean {
  const a = Buffer.from(hashCode(email, code, secret), "hex");
  const b = Buffer.from(storedHash, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Accepts "123 456", "123-456" etc.; returns the 6 digits or null. */
export function normaliseCode(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "");
  return new RegExp(`^\\d{${OTP_LENGTH}}$`).test(digits) ? digits : null;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function buildOtpEmail(code: string, name?: string) {
  const greeting = name ? `Hi ${name},` : "Hi,";
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  return {
    subject: `${spaced} is your FUYL admin sign-in code`,
    text: `${greeting}\n\nYour FUYL admin sign-in code is: ${spaced}\n\nIt expires in ${OTP_TTL_MINUTES} minutes and can be used once.\nIf you didn't try to sign in, you can ignore this email.`,
    html: `<!doctype html><html><body style="margin:0;background:#f6f9f1">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#fff;border-radius:20px;padding:32px 28px">
<tr><td style="font:500 11px/1 Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#558476">FUYL · Admin</td></tr>
<tr><td style="font:15px/1.6 Arial,sans-serif;color:#4a5a3a;padding-top:16px">${esc(greeting)} here is your sign-in code:</td></tr>
<tr><td style="font:600 34px/1 'Courier New',monospace;letter-spacing:.18em;color:#12291f;padding:18px 0">${esc(spaced)}</td></tr>
<tr><td style="font:13px/1.6 Arial,sans-serif;color:#4a5a3a">It expires in ${OTP_TTL_MINUTES} minutes and can be used once. If you didn't try to sign in, you can ignore this email.</td></tr>
</table></td></tr></table></body></html>`,
  };
}
