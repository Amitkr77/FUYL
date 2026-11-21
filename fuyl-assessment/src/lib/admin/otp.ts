import "server-only";
import { connectDB } from "@/lib/db";
import { maskEmail, sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { AdminOtp, AdminOtpRequest, AdminUser } from "@/models/admin";
import { buildOtpEmail, codeMatches, decideThrottle, generateCode, hashCode, OTP_MAX_ATTEMPTS, OTP_TTL_MINUTES } from "./otpCode";

export type RequestOtpResult = { ok: true } | { ok: false; error: string; retryAfter?: number };

/**
 * Email a one-time sign-in code. The response is the SAME whether or not the
 * email belongs to an active admin, so the form can't be used to discover who
 * has access. Throttled per email (60 s between codes, 5 per hour), including
 * for unknown emails, so the throttle reveals nothing either.
 */
export async function requestOtp(emailInput: string): Promise<RequestOtpResult> {
  await connectDB();
  const email = emailInput.trim().toLowerCase();
  // Throttle first — identically for known and unknown emails.
  const prior = await AdminOtpRequest.findOne({ email }).lean();
  const decision = decideThrottle(prior ? { lastAt: prior.lastAt, windowStart: prior.windowStart, count: prior.count ?? 0 } : null);
  if (!decision.ok) return decision;
  await AdminOtpRequest.updateOne(
    { email },
    { $set: { ...decision.next, expiresAt: new Date(Date.now() + 2 * 3_600_000) } },
    { upsert: true },
  );

  const user = await AdminUser.findOne({ email, active: true }, { name: 1 }).lean();
  if (!user) {
    // Same timing-ish and same answer as a real send.
    console.info(`[otp] code requested for unknown or inactive email ${maskEmail(email)}`);
    return { ok: true };
  }

  const code = generateCode();
  await AdminOtp.deleteMany({ email }); // only the newest code is valid
  await AdminOtp.create({ email, codeHash: hashCode(email, code, env().SESSION_SECRET), expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000) });

  const outcome = await sendEmail({ to: email, ...buildOtpEmail(code, user.name) });
  if (outcome.status === "failed") return { ok: false, error: "We couldn't send the code right now. Please try again in a minute." };
  if (outcome.status === "logged") {
    // No SMTP configured: never print codes in production.
    if (process.env.NODE_ENV !== "production") console.info(`[otp] dev code for ${maskEmail(email)}: ${code}`);
  }
  return { ok: true };
}

export type VerifyOtpResult = { ok: true; userId: string; sessionVersion: number; email: string } | { ok: false; error: string };

/** Check a code. Wrong guesses count; after OTP_MAX_ATTEMPTS the code is void. */
export async function verifyOtp(emailInput: string, code: string): Promise<VerifyOtpResult> {
  await connectDB();
  const email = emailInput.trim().toLowerCase();
  const generic = { ok: false as const, error: "That code is incorrect or has expired." };
  const otp = await AdminOtp.findOne({ email }).sort({ createdAt: -1 });
  if (!otp || otp.expiresAt < new Date()) return generic;

  if (!codeMatches(email, code, otp.codeHash, env().SESSION_SECRET)) {
    otp.attempts = (otp.attempts ?? 0) + 1;
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      await otp.deleteOne();
      return { ok: false, error: "Too many wrong codes. Please request a new one." };
    }
    await otp.save();
    return generic;
  }

  // Single use: consume first, then check the account is still allowed in.
  const consumed = await AdminOtp.deleteOne({ _id: otp._id });
  if (consumed.deletedCount !== 1) return generic; // a parallel request already used it
  const user = await AdminUser.findOne({ email, active: true });
  if (!user) return generic;
  user.lastLoginAt = new Date();
  user.failedLogins = 0;
  await user.save();
  return { ok: true, userId: user.id, sessionVersion: user.sessionVersion ?? 1, email };
}
