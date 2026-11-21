import { describe, expect, it } from "vitest";
import { buildOtpEmail, codeMatches, decideThrottle, generateCode, hashCode, normaliseCode } from "@/lib/admin/otpCode";

const secret = "x".repeat(48);

describe("one-time sign-in codes", () => {
  it("generates 6-digit codes, including leading zeros", () => {
    for (let i = 0; i < 500; i++) expect(generateCode()).toMatch(/^\d{6}$/);
  });

  it("matches only the right code, for the right email, with the right secret", () => {
    const h = hashCode("Admin@Fuyl.in", "123456", secret);
    expect(codeMatches("admin@fuyl.in", "123456", h, secret)).toBe(true); // email is case-insensitive
    expect(codeMatches("admin@fuyl.in", "123457", h, secret)).toBe(false);
    expect(codeMatches("other@fuyl.in", "123456", h, secret)).toBe(false);
    expect(codeMatches("admin@fuyl.in", "123456", h, "y".repeat(48))).toBe(false);
    expect(codeMatches("admin@fuyl.in", "123456", "not-hex", secret)).toBe(false);
  });

  it("never stores the code itself", () => {
    expect(hashCode("a@b.co", "123456", secret)).not.toContain("123456");
  });

  it("normalises typed codes", () => {
    expect(normaliseCode("123 456")).toBe("123456");
    expect(normaliseCode("123-456")).toBe("123456");
    expect(normaliseCode("12345")).toBeNull();
    expect(normaliseCode("abcdef")).toBeNull();
  });

  it("builds a code email that escapes the name", () => {
    const e = buildOtpEmail("012345", "<b>Amit</b>");
    expect(e.subject).toBe("012 345 is your FUYL admin sign-in code");
    expect(e.html).toContain("012 345");
    expect(e.html).not.toContain("<b>Amit</b>");
    expect(e.text).toContain("expires in 10 minutes");
  });
});

describe("code request throttle", () => {
  const t0 = new Date("2026-11-21T10:00:00Z");
  const at = (s: number) => new Date(t0.getTime() + s * 1000);

  it("allows the first request and starts a window", () => {
    expect(decideThrottle(null, t0)).toEqual({ ok: true, next: { lastAt: t0, windowStart: t0, count: 1 } });
  });

  it("enforces 60 seconds between codes", () => {
    const r = decideThrottle({ lastAt: t0, windowStart: t0, count: 1 }, at(20));
    expect(r).toMatchObject({ ok: false, retryAfter: 40, error: "Please wait 40s before requesting another code." });
    expect(decideThrottle({ lastAt: t0, windowStart: t0, count: 1 }, at(61)).ok).toBe(true);
  });

  it("caps at 5 codes per hour, then resets", () => {
    const state = { lastAt: at(300), windowStart: t0, count: 5 };
    expect(decideThrottle(state, at(400))).toMatchObject({ ok: false, error: expect.stringMatching(/Too many codes/) });
    expect(decideThrottle(state, at(3601))).toMatchObject({ ok: true, next: { count: 1 } });
  });
});
