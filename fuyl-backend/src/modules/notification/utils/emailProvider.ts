import { env } from '../../../config/env';
import { logger } from '../../../config/logger';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

// ─── Resend (production / deployed environments) ─────────────────────────────
// Cloud platforms (Render, Railway, Fly.io, etc.) block outbound SMTP ports
// (25, 465, 587), which causes ETIMEDOUT at connection time. Resend sends over
// HTTPS, bypassing that restriction entirely.

async function sendViaResend(msg: EmailMessage): Promise<{ providerMessageId: string }> {
  const { Resend } = await import('resend');
  const client = new Resend(env.resend.apiKey);

  const { data, error } = await client.emails.send({
    from:    msg.from ?? env.resend.from,
    to:      msg.to,
    subject: msg.subject,
    html:    msg.html,
    ...(msg.text ? { text: msg.text } : {}),
  });

  if (error) {
    throw new Error(`[resend] ${error.message}`);
  }

  return { providerMessageId: data!.id };
}

// ─── Nodemailer / SMTP (local dev only) ──────────────────────────────────────
// Use this when running locally with Mailpit, Mailtrap, or a real mail server.
// Never used on Render/Railway — SMTP ports are blocked there; set
// RESEND_API_KEY instead.

async function sendViaSMTP(msg: EmailMessage): Promise<{ providerMessageId: string }> {
  const nodemailer = (await import('nodemailer')).default;
  const transporter = nodemailer.createTransport({
    host:   env.smtp.host,
    port:   env.smtp.port,
    secure: env.smtp.port === 465,
    auth:   { user: env.smtp.user, pass: env.smtp.pass },
  });
  const info = await transporter.sendMail({
    from:    msg.from ?? env.smtp.from,
    to:      msg.to,
    subject: msg.subject,
    html:    msg.html,
    text:    msg.text,
  });
  return { providerMessageId: info.messageId };
}

// ─── Stub (no provider configured) ───────────────────────────────────────────

async function sendStub(msg: EmailMessage): Promise<{ providerMessageId: string }> {
  logger.info('[notification] STUB email (no provider configured)', {
    to:      msg.to,
    subject: msg.subject,
  });
  return { providerMessageId: `stub-${Date.now()}` };
}

// ─── Public API ───────────────────────────────────────────────────────────────
// Priority: Resend (RESEND_API_KEY set) → SMTP (all SMTP vars set) → stub log.

export async function sendEmail(msg: EmailMessage): Promise<{ providerMessageId: string }> {
  if (env.resend.apiKey) {
    return sendViaResend(msg);
  }

  if (env.smtp.host && env.smtp.user && env.smtp.pass) {
    return sendViaSMTP(msg);
  }

  logger.warn('[notification] No email provider configured (set RESEND_API_KEY or SMTP_HOST/USER/PASS)');
  return sendStub(msg);
}

/**
 * Derives a plain-text fallback from an HTML email body, for clients that
 * don't render HTML at all. Not a general-purpose HTML-to-text converter —
 * just enough for the templates in builtinTemplates.ts (which only ever use
 * <p>/<a>/<table>/<tr>/<td>/<span>/<strong> tags via emailLayout.ts).
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, '')
    .replace(/<a\s+[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<\/(p|div|tr|h[1-6])>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&middot;/g, '·')
    .replace(/&copy;/g, '©')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}
