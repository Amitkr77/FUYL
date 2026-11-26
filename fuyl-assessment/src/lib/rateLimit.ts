import "server-only";

/**
 * Small fixed-window rate limiter kept in memory. Good enough for a single
 * instance; behind several instances each keeps its own count (move to Redis
 * or the database if the app is scaled out).
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * End-to-end tests run many assessments from one IP; RATE_LIMIT_MULTIPLIER
 * (set only by the e2e launcher) scales every limit up. Never set in production.
 */
const MULTIPLIER = Math.max(1, Number(process.env.RATE_LIMIT_MULTIPLIER) || 1);

export function rateLimit(key: string, baseLimit: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const limit = baseLimit * MULTIPLIER;
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  return { ok: b.count <= limit, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
}

/** True if `key` has already used up `limit` within its current window (doesn't count a hit). */
export function isRateLimited(key: string, baseLimit: number): boolean {
  const b = buckets.get(key);
  return Boolean(b && b.resetAt > Date.now() && b.count >= baseLimit * MULTIPLIER);
}

/** Client IP inside a Server Action (no Request object there). */
export async function clientIpFromHeaders(): Promise<string> {
  const { headers } = await import("next/headers");
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim();
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
}

/**
 * Rate limit shared by all server instances (MongoDB), for the public API.
 * The in-memory limiter runs first as a cheap filter; if the database is
 * unreachable we fall back to it rather than failing the request.
 */
export async function rateLimitShared(key: string, baseLimit: number, windowMs: number): Promise<{ ok: boolean }> {
  if (!rateLimit(key, baseLimit, windowMs).ok) return { ok: false };
  const limit = baseLimit * MULTIPLIER;
  const windowStart = Math.floor(Date.now() / windowMs) * windowMs;
  try {
    const [{ connectDB }, { RateBucket }] = await Promise.all([import("@/lib/db"), import("@/models/admin")]);
    await connectDB();
    const doc = await RateBucket.findOneAndUpdate(
      { _id: `${key}|${windowStart}` },
      { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date(windowStart + windowMs) } },
      { upsert: true, new: true },
    ).lean();
    return { ok: (doc?.count ?? 0) <= limit };
  } catch (err) {
    console.warn("[rateLimit] shared store unavailable, using in-memory only", err instanceof Error ? err.message : err);
    return { ok: true };
  }
}
