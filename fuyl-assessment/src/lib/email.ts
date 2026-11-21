import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { env, type Env } from "@/lib/env";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type EmailOutcome = { status: "sent"; id?: string } | { status: "logged" } | { status: "failed"; error: string };

/**
 * Report email over SMTP (nodemailer). Without SMTP_HOST the email is skipped
 * and a one-line notice is logged — never the body, which contains health
 * information — so local development works without credentials.
 *
 * The transport is pooled and cached on globalThis (shared across Next's
 * separately bundled route handlers), and rebuilt if the settings change.
 */
const g = globalThis as unknown as { __fuylSmtp?: { key: string; transport: Transporter } };

export function smtpOptions(e: Pick<Env, "SMTP_HOST" | "SMTP_PORT" | "SMTP_SECURE" | "SMTP_USER" | "SMTP_PASS"> & { SMTP_ALLOW_INSECURE?: "true" | "false" }) {
  const secure = e.SMTP_SECURE ? e.SMTP_SECURE === "true" : e.SMTP_PORT === 465;
  const insecure = e.SMTP_ALLOW_INSECURE === "true"; // e2e fake server only
  return {
    host: e.SMTP_HOST,
    port: e.SMTP_PORT,
    secure,
    // On non-implicit-TLS ports, refuse to send credentials or health data in plain text.
    requireTLS: !secure && !insecure,
    ignoreTLS: insecure,
    auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASS ?? "" } : undefined,
    pool: true,
    maxConnections: 3,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  };
}

function transport(e: Env): Transporter {
  const opts = smtpOptions(e);
  const key = JSON.stringify({ ...opts, auth: opts.auth ? { user: opts.auth.user, pass: "•" + opts.auth.pass.length } : undefined });
  if (!g.__fuylSmtp || g.__fuylSmtp.key !== key) {
    g.__fuylSmtp?.transport.close();
    g.__fuylSmtp = { key, transport: nodemailer.createTransport(opts) };
  }
  return g.__fuylSmtp.transport;
}

export async function sendEmail(msg: EmailMessage): Promise<EmailOutcome> {
  const e = env();
  if (!e.SMTP_HOST) {
    console.info(`[email] SMTP_HOST not set — report email to ${maskEmail(msg.to)} not sent (subject: "${msg.subject}")`);
    return { status: "logged" };
  }
  try {
    const info = await transport(e).sendMail({ from: e.EMAIL_FROM, to: msg.to, subject: msg.subject, html: msg.html, text: msg.text });
    return { status: "sent", id: info.messageId };
  } catch (err) {
    // Log a safe summary; SMTP errors never include the message body.
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[email] SMTP send to ${maskEmail(msg.to)} failed: ${error}`);
    return { status: "failed", error };
  }
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 2)}***@${domain ?? ""}`;
}
