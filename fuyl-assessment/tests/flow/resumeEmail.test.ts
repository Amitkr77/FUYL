import { describe, expect, it } from "vitest";
import { buildResumeEmail } from "@/lib/resumeEmail";

describe("resume reminder email", () => {
  const mail = buildResumeEmail({ name: "Riya", percent: 42.4, minutesLeft: 2, resumeUrl: "https://example.test/resume/abc123" });

  it("says how far along they are and links back to the exact spot", () => {
    expect(mail.subject).toBe("Riya, your FUYL assessment is saved — about 2 minutes to go");
    expect(mail.html).toContain("42% of the way through");
    expect(mail.html).toContain('href="https://example.test/resume/abc123"');
    expect(mail.text).toContain("https://example.test/resume/abc123");
  });

  it("escapes the name", () => {
    const evil = buildResumeEmail({ name: "<b>x</b>", percent: 10, minutesLeft: 1, resumeUrl: "https://e.test/r/t" });
    expect(evil.html).not.toContain("<b>x</b>");
    expect(evil.html).toContain("&lt;b&gt;");
  });

  it("works without a name and never shows 0% or 100%", () => {
    const m = buildResumeEmail({ percent: 0, minutesLeft: 1, resumeUrl: "https://e.test/r/t" });
    expect(m.subject).toBe("Your FUYL assessment is saved — about a minute to go");
    expect(m.html).toContain("1% of the way through");
  });
});
