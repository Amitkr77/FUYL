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
  const hash = sha256(sid);
  // A browser that joined via a "continue" link has one of the session's extra ids.
  return (await AssessmentSession.findById(hash)) ?? (await AssessmentSession.findOne({ altSids: hash }));
}

const setSessionCookie = async (sid: string) =>
  (await cookies()).set(SESSION_COOKIE, sid, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 86_400,
  });

/**
 * Let this browser continue an existing session (opened from a "continue
 * where you left off" email). Adds a fresh browser id to the session — the
 * original browser keeps working too. Keeps the last few ids only.
 */
export async function joinSession(sessionId: string) {
  await connectDB();
  const sid = randomToken(32);
  await AssessmentSession.updateOne(
    { _id: sessionId },
    { $push: { altSids: { $each: [sha256(sid)], $slice: -5 } }, $set: { expiresAt: daysFromNow(SESSION_TTL_DAYS) } },
  );
  await setSessionCookie(sid);
}

/** Start a fresh session (replacing any previous one in this browser). */
export async function createSession(input: {
  consentVersion: string;
  kbVersion: number;
  utm?: Utm;
  mode?: "standard" | "assisted";
  email?: string;
  chat?: Record<string, unknown>;
}) {
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
    mode: input.mode ?? "standard",
    ...(input.email ? { email: input.email } : {}),
    ...(input.chat ? { chat: input.chat } : {}),
    expiresAt: daysFromNow(SESSION_TTL_DAYS),
  });
  await setSessionCookie(sid);
  return doc;
}

export const sessionAnswers = (doc: { answers?: unknown }): Answers => (doc.answers ?? {}) as Answers;
