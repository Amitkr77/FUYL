import { describe, expect, it } from "vitest";
import { resolveAppUrl } from "@/lib/env";

describe("APP_URL for emailed links", () => {
  it("uses an explicit public URL", () => {
    expect(resolveAppUrl("https://fuyl-assessment.vercel.app", { VERCEL: "1", VERCEL_ENV: "production" })).toBe("https://fuyl-assessment.vercel.app");
  });

  it("never sends localhost links from a Vercel deployment", () => {
    const vercel = { VERCEL: "1", VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "fuyl-assessment.vercel.app", VERCEL_URL: "fuyl-assessment-abc123.vercel.app" };
    expect(resolveAppUrl(undefined, vercel)).toBe("https://fuyl-assessment.vercel.app");
    expect(resolveAppUrl("", vercel)).toBe("https://fuyl-assessment.vercel.app");
    expect(resolveAppUrl("http://localhost:3002", vercel)).toBe("https://fuyl-assessment.vercel.app");
  });

  it("previews link to their own deployment", () => {
    expect(resolveAppUrl(undefined, { VERCEL: "1", VERCEL_ENV: "preview", VERCEL_URL: "fuyl-assessment-git-x.vercel.app" })).toBe("https://fuyl-assessment-git-x.vercel.app");
  });

  it("keeps localhost for local development", () => {
    expect(resolveAppUrl(undefined, {})).toBe("http://localhost:3002");
    expect(resolveAppUrl("http://localhost:3002", {})).toBe("http://localhost:3002");
  });
});
