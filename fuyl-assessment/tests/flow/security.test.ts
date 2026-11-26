import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkApiRequest, type ApiRequestFacts } from "@/lib/botGuard";

const CHROME = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const req = (over: Partial<ApiRequestFacts> = {}): ApiRequestFacts => ({
  method: "POST",
  path: "/api/answer",
  userAgent: CHROME,
  origin: "https://assess.fuyl.in",
  referer: null,
  host: "assess.fuyl.in",
  allowAutomation: false,
  ...over,
});

describe("API bot guard", () => {
  it("lets real browsers through from our own pages", () => {
    expect(checkApiRequest(req())).toEqual({ ok: true });
    expect(checkApiRequest(req({ method: "GET", origin: null }))).toEqual({ ok: true });
    expect(checkApiRequest(req({ origin: null, referer: "https://assess.fuyl.in/q" }))).toEqual({ ok: true });
  });

  it.each(["curl/8.4.0", "python-requests/2.31", "Go-http-client/1.1", "axios/1.6.0", "PostmanRuntime/7.36", "Mozilla/5.0 HeadlessChrome/120.0", "Scrapy/2.11", ""])(
    "blocks automation clients: %s",
    (ua) => {
      expect(checkApiRequest(req({ userAgent: ua, method: "GET" }))).toMatchObject({ ok: false, status: 403 });
    },
  );

  it("blocks state-changing calls from other sites or with no origin", () => {
    expect(checkApiRequest(req({ origin: "https://evil.example" }))).toMatchObject({ ok: false, status: 403 });
    expect(checkApiRequest(req({ origin: null, referer: null }))).toMatchObject({ ok: false, status: 403 });
    expect(checkApiRequest(req({ origin: "not a url" }))).toMatchObject({ ok: false });
  });

  it("leaves health checks and scheduled jobs alone (they have their own secret)", () => {
    expect(checkApiRequest(req({ path: "/api/cron/reminders", userAgent: "vercel-cron/1.0", origin: null }))).toEqual({ ok: true });
    expect(checkApiRequest(req({ path: "/api/health", userAgent: "curl/8", method: "GET" }))).toEqual({ ok: true });
  });

  it("test environments can allow automated browsers (never in production)", () => {
    expect(checkApiRequest(req({ userAgent: "HeadlessChrome", allowAutomation: true }))).toEqual({ ok: true });
  });
});

describe("speed check", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("blocks a streak of answers faster than a person can tap, and resets on a normal pace", async () => {
    vi.stubEnv("ALLOW_AUTOMATION", "");
    const { checkPace, PACE } = await import("@/lib/humanCheck");
    const t0 = new Date("2026-01-01T00:00:00Z").getTime();
    let s = { lastAnswerAt: null as Date | null, fastStreak: 0 };
    let verdict = { ok: true, fastStreak: 0 };
    for (let i = 0; i <= PACE.maxFastStreak; i++) {
      const now = new Date(t0 + i * 100);
      verdict = checkPace(s, now);
      s = { lastAnswerAt: now, fastStreak: verdict.fastStreak };
    }
    expect(verdict.ok).toBe(false);
    expect(checkPace(s, new Date(t0 + 10_000))).toEqual({ ok: true, fastStreak: 0 });
  });
});

describe("human check (honeypot + Turnstile)", () => {
  const original = { ...process.env };
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    process.env = { ...original };
    vi.unstubAllGlobals();
  });
  const base = { MONGODB_URI: "mongodb://x", SESSION_SECRET: "s".repeat(40) };

  it("rejects a filled honeypot even without Turnstile", async () => {
    process.env = { ...original, ...base, TURNSTILE_SECRET_KEY: "" };
    const { verifyHuman } = await import("@/lib/humanCheck");
    expect(await verifyHuman({ hp: "Acme Ltd", ip: "1.2.3.4", action: "start" })).toMatchObject({ ok: false });
    expect(await verifyHuman({ hp: "", ip: "1.2.3.4", action: "start" })).toEqual({ ok: true });
  });

  it("with a secret: requires a token Cloudflare confirms, for the right action", async () => {
    process.env = { ...original, ...base, TURNSTILE_SECRET_KEY: "secret" };
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { verifyHuman } = await import("@/lib/humanCheck");

    expect(await verifyHuman({ ip: "1.2.3.4", action: "start" })).toMatchObject({ ok: false });

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: true, action: "start" })));
    expect(await verifyHuman({ human: "tok", ip: "1.2.3.4", action: "start" })).toEqual({ ok: true });

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: false, "error-codes": ["invalid-input-response"] })));
    expect(await verifyHuman({ human: "bad", ip: "1.2.3.4", action: "start" })).toMatchObject({ ok: false });

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ success: true, action: "unlock" })));
    expect(await verifyHuman({ human: "tok", ip: "1.2.3.4", action: "start" })).toMatchObject({ ok: false });
  });

  it("if Cloudflare is unreachable, real people aren't locked out", async () => {
    process.env = { ...original, ...base, TURNSTILE_SECRET_KEY: "secret" };
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { verifyHuman } = await import("@/lib/humanCheck");
    expect(await verifyHuman({ human: "tok", ip: "1.2.3.4", action: "start" })).toEqual({ ok: true });
    warn.mockRestore();
  });
});
