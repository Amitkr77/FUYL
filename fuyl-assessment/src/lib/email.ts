import "server-only";
import { env } from "@/lib/env";

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type EmailOutcome = { status: "sent"; id?: string } | { status: "logged" } | { status: "failed"; error: string };

/**
 * Send via Resend when RESEND_API_KEY is set; otherwise log a short notice
 * (never the email body — it contains health information) so local
 * development works without credentials.
 */
export async function sendEmail(msg: EmailMessage): Promise<EmailOutcome> {
  const { RESEND_API_KEY, EMAIL_FROM } = env();
  if (!RESEND_API_KEY) {
    console.info(`[email] RESEND_API_KEY not set — report email to ${maskEmail(msg.to)} not sent (subject: "${msg.subject}")`);
    return { status: "logged" };
  }
  try {
    const { Resend } = await import("resend");
    const { data, error } = await new Resend(RESEND_API_KEY).emails.send({
      from: EMAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
    });
    if (error) return { status: "failed", error: error.message };
    return { status: "sent", id: data?.id };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : String(err) };
  }
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  return `${user.slice(0, 2)}***@${domain ?? ""}`;
}
