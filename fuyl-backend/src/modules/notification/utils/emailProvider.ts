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
