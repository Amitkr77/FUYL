import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { env } from "@/lib/env";
import { AdminUser, AuditLog } from "@/models/admin";
import { hashPassword, verifyPassword } from "./password";
import { ADMIN_COOKIE, ADMIN_SESSION_HOURS, signAdminToken, verifyAdminToken } from "./token";

export type AdminRole = "admin" | "reviewer";
export interface AdminSession {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
}

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
// Unknown emails are checked against a real (random) hash so they take as
// long as a wrong password — response time never reveals which emails exist.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword(randomBytes(16).toString("hex")));

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function login(emailInput: string, password: string): Promise<LoginResult> {
  await connectDB();
  const email = emailInput.trim().toLowerCase();
  const user = await AdminUser.findOne({ email });

  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    return { ok: false, error: "Too many failed attempts. Try again in a few minutes." };
  }
  const valid = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !user.active || !valid) {
    if (user) {
      user.failedLogins = (user.failedLogins ?? 0) + 1;
      if (user.failedLogins >= MAX_FAILED) {
        user.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000);
        user.failedLogins = 0;
      }
      await user.save();
    }
    await audit(email, "login.failed");
    return { ok: false, error: "Incorrect email or password." };
  }

  user.failedLogins = 0;
  user.lockedUntil = undefined;
  user.lastLoginAt = new Date();
  await user.save();

  const token = await signAdminToken({ sub: user.id, sv: user.sessionVersion ?? 1 }, env().SESSION_SECRET);
  (await cookies()).set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_SESSION_HOURS * 3600,
  });
  await audit(email, "login");
  return { ok: true };
}

export async function logout(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}

/** The signed-in admin, re-validated against the database; null if none. */
export async function getAdmin(): Promise<AdminSession | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) return null;
  const claims = await verifyAdminToken(token, env().SESSION_SECRET);
  if (!claims) return null;
  await connectDB();
  const user = await AdminUser.findById(claims.sub).lean();
  if (!user || !user.active || (user.sessionVersion ?? 1) !== claims.sv) return null;
  return { id: String(user._id), email: user.email, name: user.name, role: user.role as AdminRole };
}

/** For pages: redirect to login if not signed in (or not allowed). */
export async function requireAdminPage(roles: AdminRole[] = ["admin", "reviewer"]): Promise<AdminSession> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (!roles.includes(admin.role)) redirect("/admin?denied=1");
  return admin;
}

export class AdminAuthError extends Error {}

/** For server actions / route handlers: throw if not allowed. */
export async function requireAdmin(roles: AdminRole[] = ["admin", "reviewer"]): Promise<AdminSession> {
  const admin = await getAdmin();
  if (!admin) throw new AdminAuthError("Your session has expired. Please sign in again.");
  if (!roles.includes(admin.role)) throw new AdminAuthError("You don't have permission to do that.");
  return admin;
}

export async function audit(actor: string | undefined, action: string, target?: string, details?: unknown): Promise<void> {
  try {
    await AuditLog.create({ actor, action, target, details });
  } catch (err) {
    console.error("[audit] failed", err);
  }
}
