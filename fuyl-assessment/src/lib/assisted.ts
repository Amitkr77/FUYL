import "server-only";
import { AssistedSettingsSchema, DEFAULT_ASSISTED_SETTINGS, type AssistedSettings } from "@/chat/settings";
import { connectDB } from "@/lib/db";
import { AiUsage, AppSetting } from "@/models/admin";

const KEY = "assisted";
const TTL_MS = 15_000;
const g = globalThis as unknown as { __fuylAssisted?: { at: number; value: AssistedSettings } | null };

/** Current settings (stored values merged over defaults), cached for a few seconds. */
export async function getAssistedSettings(): Promise<AssistedSettings> {
  const c = g.__fuylAssisted;
  if (c && Date.now() - c.at < TTL_MS) return c.value;
  await connectDB();
  const doc = await AppSetting.findById(KEY).lean();
  const parsed = AssistedSettingsSchema.safeParse({ ...DEFAULT_ASSISTED_SETTINGS, ...((doc?.value as object) ?? {}) });
  const value = parsed.success ? parsed.data : DEFAULT_ASSISTED_SETTINGS;
  g.__fuylAssisted = { at: Date.now(), value };
  return value;
}

export async function saveAssistedSettings(value: AssistedSettings, by: string) {
  await connectDB();
  await AppSetting.updateOne({ _id: KEY }, { $set: { value, updatedBy: by } }, { upsert: true });
  g.__fuylAssisted = null;
}

// ─── Daily AI usage ─────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);
const expiry = () => new Date(Date.now() + 120 * 86_400_000);

/**
 * Reserve one AI request for today. Returns false once the daily cap is used
 * up. Atomic: the filter only matches while `calls < cap`; when the cap is
 * reached the upsert collides with the existing document and we say no.
 */
export async function reserveAiCall(cap: number): Promise<boolean> {
  if (cap <= 0) return false;
  await connectDB();
  try {
    const r = await AiUsage.findOneAndUpdate(
      { _id: today(), calls: { $lt: cap } },
      { $inc: { calls: 1 }, $setOnInsert: { expiresAt: expiry() } },
      { upsert: true, new: true },
    );
    return Boolean(r);
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return false;
    throw err;
  }
}

export async function recordAiUsage(u: { failure?: boolean; fallback?: boolean; promptTokens?: number; completionTokens?: number }) {
  await connectDB();
  await AiUsage.updateOne(
    { _id: today() },
    {
      $inc: {
        failures: u.failure ? 1 : 0,
        fallbacks: u.fallback ? 1 : 0,
        promptTokens: u.promptTokens ?? 0,
        completionTokens: u.completionTokens ?? 0,
      },
      $setOnInsert: { expiresAt: expiry() },
    },
    { upsert: true },
  );
}

export async function aiUsageDays(days = 14) {
  await connectDB();
  return AiUsage.find({}).sort({ _id: -1 }).limit(days).lean();
}
