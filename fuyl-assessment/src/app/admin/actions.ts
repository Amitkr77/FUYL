"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AdminAuthError, audit, login, loginWithOtp, logout, requireAdmin, type AdminRole } from "@/lib/admin/auth";
import { requestOtp } from "@/lib/admin/otp";
import { normaliseCode } from "@/lib/admin/otpCode";
import { getDraft, publishDraft, restoreVersionToDraft, saveDraft } from "@/lib/admin/kbStore";
import { connectDB } from "@/lib/db";
import { clientIpFromHeaders, isRateLimited, rateLimit } from "@/lib/rateLimit";
import { deleteEntity, markDraft, reviewKey, upsertEntity } from "@/kb/draft";
import { ENTITY_TYPES, Key, SettingsSchema, type EntityType } from "@/kb/schema";
import { AdminUser } from "@/models/admin";
import { Submission } from "@/models/assessment";
import { acknowledgeLabels, runSync } from "@/sync/service";

export type ActionResult<T = object> = ({ ok: true } & T) | { ok: false; error: string; issues?: { path: string; message: string }[] };

/** Run an admin action with a role check; auth failures become a safe message. */
async function guarded<T extends object>(roles: AdminRole[], fn: (actor: { email: string; id: string }) => Promise<ActionResult<T>>): Promise<ActionResult<T>> {
  try {
    const admin = await requireAdmin(roles);
    return await fn(admin);
  } catch (err) {
    if (err instanceof AdminAuthError) return { ok: false, error: err.message };
    console.error("[admin action]", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

const EntityTypeSchema = z.enum(ENTITY_TYPES);

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function loginAction(_prev: { error?: string } | undefined, form: FormData): Promise<{ error?: string }> {
  // Only FAILED attempts count toward the per-IP limit, so a team sharing one
  // office IP isn't locked out by normal sign-ins. Each account also locks
  // itself for 15 minutes after 5 failures (see login()).
  const ip = await clientIpFromHeaders();
  const key = `admin-login-fail:${ip}`;
  if (isRateLimited(key, 10)) return { error: "Too many failed attempts. Please wait a few minutes." };
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password." };
  const r = await login(email, password);
  if (!r.ok) {
    rateLimit(key, 10, 10 * 60_000);
    return { error: r.error };
  }
  redirect("/admin");
}

/** Step 1 of code sign-in: email a one-time code (same answer for unknown emails). */
export async function requestOtpAction(emailInput: string): Promise<{ ok: true } | { ok: false; error: string; retryAfter?: number }> {
  const ip = await clientIpFromHeaders();
  if (!rateLimit(`admin-otp-request:${ip}`, 10, 10 * 60_000).ok) return { ok: false, error: "Too many requests. Please wait a few minutes." };
  const email = z.string().trim().toLowerCase().email().safeParse(emailInput);
  if (!email.success) return { ok: false, error: "Please enter a valid email address." };
  try {
    return await requestOtp(email.data);
  } catch (err) {
    console.error("[otp] request failed", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/** Step 2 of code sign-in: check the code and start the session. */
export async function verifyOtpAction(emailInput: string, codeInput: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const ip = await clientIpFromHeaders();
  const key = `admin-login-fail:${ip}`;
  if (isRateLimited(key, 10)) return { ok: false, error: "Too many failed attempts. Please wait a few minutes." };
  const code = normaliseCode(String(codeInput ?? ""));
  if (!code) return { ok: false, error: "Enter the 6-digit code from the email." };
  const r = await loginWithOtp(String(emailInput ?? ""), code);
  if (!r.ok) {
    rateLimit(key, 10, 10 * 60_000);
    return r;
  }
  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/admin/login");
}

// ─── Knowledge-base content ─────────────────────────────────────────────────

export async function saveEntityAction(type: EntityType, originalKey: string | null, data: unknown) {
  return guarded<{ key: string }>(["admin", "reviewer"], async (actor) => {
    const t = EntityTypeSchema.parse(type);
    const draft = await getDraft();
    const r = upsertEntity(draft.kb, t, data, originalKey ?? undefined);
    if (!r.ok) return r;
    const key = (data as { key: string }).key.trim();
    await saveDraft(r.kb, markDraft(draft.reviews, t, key, originalKey ?? undefined), actor.email);
    await audit(actor.email, originalKey ? "content.update" : "content.create", reviewKey(t, key), originalKey && originalKey !== key ? { renamedFrom: originalKey } : undefined);
    revalidatePath("/admin", "layout");
    return { ok: true, key };
  });
}

export async function deleteEntityAction(type: EntityType, key: string) {
  return guarded<object>(["admin"], async (actor) => {
    const t = EntityTypeSchema.parse(type);
    const draft = await getDraft();
    const r = deleteEntity(draft.kb, t, Key.parse(key));
    if (!r.ok) return r;
    const reviews = { ...draft.reviews };
    delete reviews[reviewKey(t, key)];
    await saveDraft(r.kb, reviews, actor.email);
    await audit(actor.email, "content.delete", reviewKey(t, key));
    revalidatePath("/admin", "layout");
    return { ok: true };
  });
}

export async function setReviewAction(items: { type: EntityType; key: string }[], status: "approved" | "draft") {
  return guarded<object>(["admin", "reviewer"], async (actor) => {
    const parsed = z.array(z.object({ type: EntityTypeSchema, key: Key })).max(500).parse(items);
    const draft = await getDraft();
    const reviews = { ...draft.reviews };
    const at = new Date().toISOString();
    for (const { type, key } of parsed) {
      reviews[reviewKey(type, key)] = status === "approved" ? { status, by: actor.email, at } : { status: "draft" };
    }
    await saveDraft(draft.kb, reviews, actor.email);
    await audit(actor.email, status === "approved" ? "review.approve" : "review.reopen", undefined, { count: parsed.length, items: parsed.slice(0, 50).map((p) => reviewKey(p.type, p.key)) });
    revalidatePath("/admin", "layout");
    return { ok: true };
  });
}

export async function saveSettingsAction(data: unknown) {
  return guarded<object>(["admin"], async (actor) => {
    const parsed = SettingsSchema.safeParse(data);
    if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) };
    const draft = await getDraft();
    await saveDraft({ ...draft.kb, settings: parsed.data }, draft.reviews, actor.email);
    await audit(actor.email, "settings.update", undefined, parsed.data);
    revalidatePath("/admin", "layout");
    return { ok: true };
  });
}

export async function publishAction(note: string) {
  return guarded<{ version: number }>(["admin"], async (actor) => {
    const r = await publishDraft(actor.email, String(note ?? ""));
    if (!r.ok) return { ok: false, error: [r.error, ...(r.details ?? [])].join("\n") };
    await audit(actor.email, "kb.publish", `v${r.version}`, { note });
    revalidatePath("/admin", "layout");
    return { ok: true, version: r.version };
  });
}

export async function restoreVersionAction(version: number) {
  return guarded<object>(["admin"], async (actor) => {
    const v = z.number().int().min(1).parse(version);
    if (!(await restoreVersionToDraft(v, actor.email))) return { ok: false, error: "Version not found." };
    await audit(actor.email, "kb.restore_to_draft", `v${v}`);
    revalidatePath("/admin", "layout");
    return { ok: true };
  });
}

// ─── Sync ───────────────────────────────────────────────────────────────────

export async function syncNowAction() {
  return guarded<{ status: string }>(["admin", "reviewer"], async (actor) => {
    const s = await runSync("admin");
    await audit(actor.email, "sync.run", undefined, { status: s.status });
    revalidatePath("/admin", "layout");
    return { ok: true, status: s.status };
  });
}

export async function acknowledgeLabelsAction() {
  return guarded<object>(["admin", "reviewer"], async (actor) => {
    await acknowledgeLabels();
    await audit(actor.email, "sync.labels_acknowledged");
    revalidatePath("/admin", "layout");
    return { ok: true };
  });
}

// ─── Submissions ────────────────────────────────────────────────────────────

export async function deleteSubmissionAction(id: string) {
  return guarded<object>(["admin"], async (actor) => {
    if (!/^[a-f0-9]{24}$/.test(id)) return { ok: false, error: "Invalid id." };
    await connectDB();
    const doc = await Submission.findByIdAndDelete(id, { projection: { email: 1 } }).lean();
    if (!doc) return { ok: false, error: "Submission not found." };
    await audit(actor.email, "submission.delete", id);
    revalidatePath("/admin/submissions");
    return { ok: true };
  });
}

// ─── Users ──────────────────────────────────────────────────────────────────

/** New users sign in with emailed one-time codes — no password is created or shared. */
export async function createUserAction(input: { email: string; name: string; role: AdminRole }) {
  return guarded<object>(["admin"], async (actor) => {
    const parsed = z
      .object({ email: z.string().trim().toLowerCase().email(), name: z.string().trim().min(1).max(80), role: z.enum(["admin", "reviewer"]) })
      .safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
    await connectDB();
    if (await AdminUser.exists({ email: parsed.data.email })) return { ok: false, error: "A user with that email already exists." };
    await AdminUser.create(parsed.data);
    await audit(actor.email, "user.create", parsed.data.email, { role: parsed.data.role });
    revalidatePath("/admin/users");
    return { ok: true };
  });
}

export async function updateUserAction(id: string, change: { role?: AdminRole; active?: boolean; signOutEverywhere?: boolean }) {
  return guarded<object>(["admin"], async (actor) => {
    if (!/^[a-f0-9]{24}$/.test(id)) return { ok: false, error: "Invalid id." };
    if (id === actor.id && (change.active === false || change.role === "reviewer")) {
      return { ok: false, error: "You can't deactivate or demote your own account." };
    }
    await connectDB();
    const user = await AdminUser.findById(id);
    if (!user) return { ok: false, error: "User not found." };
    if (change.role) user.role = z.enum(["admin", "reviewer"]).parse(change.role);
    if (typeof change.active === "boolean") user.active = change.active;
    // Any of these changes signs the user out everywhere.
    user.sessionVersion = (user.sessionVersion ?? 1) + 1;
    await user.save();
    await audit(actor.email, "user.update", user.email, { role: change.role, active: change.active, signOutEverywhere: Boolean(change.signOutEverywhere) });
    revalidatePath("/admin/users");
    return { ok: true };
  });
}

// ─── Assisted assessment settings ──────────────────────────────────────────

export async function saveAssistedSettingsAction(input: unknown): Promise<ActionResult> {
  return guarded(["admin"], async (actor): Promise<ActionResult> => {
    const { AssistedSettingsSchema } = await import("@/chat/settings");
    const parsed = AssistedSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "Please fix the highlighted fields.",
        issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      };
    }
    const { saveAssistedSettings } = await import("@/lib/assisted");
    await saveAssistedSettings(parsed.data, actor.email);
    await audit(actor.email, "assisted.settings", "assisted", parsed.data);
    revalidatePath("/admin/assisted");
    revalidatePath("/");
    return { ok: true };
  });
}
