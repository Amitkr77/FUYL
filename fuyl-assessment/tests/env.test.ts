import { afterEach, describe, expect, it, vi } from "vitest";

describe("env()", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
    vi.resetModules();
  });

  it("throws a readable error when required variables are missing", async () => {
    delete process.env.MONGODB_URI;
    delete process.env.SESSION_SECRET;
    const { env } = await import("@/lib/env");
    expect(() => env()).toThrow(/MONGODB_URI/);
  });

  it("applies defaults for optional variables", async () => {
    process.env.MONGODB_URI = "mongodb://localhost:27017";
    process.env.SESSION_SECRET = "x".repeat(40);
    delete process.env.FUYL_PRODUCT_HANDLE;
    const { env } = await import("@/lib/env");
    const e = env();
    expect(e.FUYL_PRODUCT_HANDLE).toBe("fuyl-complete");
    expect(e.MONGODB_DB).toBe("fuyl_assessment");
  });
});
