import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn();
vi.mock("nodemailer", () => ({
  default: { createTransport: vi.fn(() => ({ sendMail, close: vi.fn() })) },
}));

const base = { MONGODB_URI: "mongodb://x", SESSION_SECRET: "s".repeat(40) };
const msg = { to: "riya@example.com", subject: "Your report", html: "<p>hi</p>", text: "hi" };

describe("sendEmail (SMTP)", () => {
  const original = { ...process.env };
  beforeEach(() => {
    vi.resetModules();
    sendMail.mockReset();
    delete (globalThis as { __fuylSmtp?: unknown }).__fuylSmtp;
  });
  afterEach(() => {
    process.env = { ...original };
  });

  it("skips (logs) when SMTP_HOST is not set, without logging the body", async () => {
    process.env = { ...original, ...base, SMTP_HOST: "" };
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const { sendEmail } = await import("@/lib/email");
    expect(await sendEmail(msg)).toEqual({ status: "logged" });
    expect(sendMail).not.toHaveBeenCalled();
    expect(info.mock.calls[0][0]).toContain("ri***@example.com");
    expect(info.mock.calls[0][0]).not.toContain("<p>hi</p>");
    info.mockRestore();
  });

  it("sends through SMTP with the configured sender", async () => {
    process.env = { ...original, ...base, SMTP_HOST: "smtp.example.com", SMTP_PORT: "587", SMTP_USER: "u", SMTP_PASS: "p", EMAIL_FROM: "FUYL <hello@fuyl.in>" };
    sendMail.mockResolvedValue({ messageId: "<abc@x>" });
    const { sendEmail } = await import("@/lib/email");
    expect(await sendEmail(msg)).toEqual({ status: "sent", id: "<abc@x>" });
    expect(sendMail).toHaveBeenCalledWith({ from: "FUYL <hello@fuyl.in>", ...msg });
  });

  it("reports SMTP failures without throwing", async () => {
    process.env = { ...original, ...base, SMTP_HOST: "smtp.example.com" };
    sendMail.mockRejectedValue(new Error("535 Authentication failed"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const { sendEmail } = await import("@/lib/email");
    expect(await sendEmail(msg)).toEqual({ status: "failed", error: "535 Authentication failed" });
    err.mockRestore();
  });

  it("picks TLS settings from the port", async () => {
    const { smtpOptions } = await import("@/lib/email");
    expect(smtpOptions({ SMTP_HOST: "h", SMTP_PORT: 465 })).toMatchObject({ secure: true, requireTLS: false });
    expect(smtpOptions({ SMTP_HOST: "h", SMTP_PORT: 587 })).toMatchObject({ secure: false, requireTLS: true });
    expect(smtpOptions({ SMTP_HOST: "h", SMTP_PORT: 2525, SMTP_SECURE: "true" })).toMatchObject({ secure: true });
    expect(smtpOptions({ SMTP_HOST: "h", SMTP_PORT: 587 }).auth).toBeUndefined();
  });
});
