import "server-only";
import { cookies } from "next/headers";
import type { Answers } from "@/engine";
import { connectDB } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { AssessmentSession, SESSION_TTL_DAYS, daysFromNow } from "@/models/assessment";

export const SESSION_COOKIE = "fuyl_assess_sid";

export interface Utm {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
}

/** The current session document, or null. Reads the httpOnly cookie. */
export async function loadSession() {
  const sid = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sid) return null;
  await connectDB();
  return AssessmentSession.findById(sha256(sid));
}

/** Start a fresh session (replacing any previous one in this browser). */
export async function createSession(input: { consentVersion: string; kbVersion: number; utm?: Utm }) {
  await connectDB();
  const sid = randomToken(32);
  const doc = await AssessmentSession.create({
    _id: sha256(sid),
    answers: {},
    path: [],
    status: "active",
    kbVersion: input.kbVersion,
    consent: { at: new Date(), version: input.consentVersion },
    utm: input.utm,
    expiresAt: daysFromNow(SESSION_TTL_DAYS),
  });
  (await cookies()).set(SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 86_400,
  });
  return doc;
}

export const sessionAnswers = (doc: { answers?: unknown }): Answers => (doc.answers ?? {}) as Answers;
