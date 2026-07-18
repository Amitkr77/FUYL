import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;
  // BUG FIXED (found live end-to-end testing): this only checked
  // `env.smtp.host`, unlike the SMS/push providers which check their whole
  // credential set before deciding to stub. A host set without matching
  // user/pass (e.g. a partially-filled .env) made nodemailer attempt a real
  // SMTP connection with empty auth, which fails hard with "Missing
  // credentials for PLAIN" instead of degrading gracefully — every order
  // confirmation email failed outright rather than just being logged.
  if (!env.smtp.host || !env.smtp.user || !env.smtp.pass) {
    // Use a stub transport when SMTP not fully configured (logs to console)
    logger.warn('[notification] SMTP not fully configured — using stub transport');
    transporter = nodemailer.createTransport({ jsonTransport: true });
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.pass },
  });
  return transporter;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
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

export async function sendEmail(msg: EmailMessage): Promise<{ providerMessageId: string }> {
  const t = getTransporter();
  const info = await t.sendMail({
    from: msg.from ?? env.smtp.from,
    to: msg.to,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
  });
  return { providerMessageId: info.messageId };
}
