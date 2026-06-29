import twilio from 'twilio';
import { env } from '../../../config/env';
import { logger } from '../../../config/logger';

let client: twilio.Twilio | null = null;

function getClient(): twilio.Twilio | null {
  if (client) return client;
  if (!env.twilio.accountSid || !env.twilio.authToken) {
    logger.warn('[notification] Twilio not configured — SMS will be logged only');
    return null;
  }
  client = twilio(env.twilio.accountSid, env.twilio.authToken);
  return client;
}

export interface SmsMessage {
  to: string;
  body: string;
}

export async function sendSms(msg: SmsMessage): Promise<{ providerMessageId?: string }> {
  const c = getClient();
  if (!c || !env.twilio.from) {
    logger.info(`[notification][sms-stub] to=${msg.to} body=${msg.body}`);
    return { providerMessageId: undefined };
  }
  const result = await c.messages.create({
    from: env.twilio.from,
    to: msg.to,
    body: msg.body,
  });
  return { providerMessageId: result.sid };
}

export async function sendWhatsapp(msg: SmsMessage): Promise<{ providerMessageId?: string }> {
  const c = getClient();
  if (!c || !env.twilio.from) {
    logger.info(`[notification][wa-stub] to=${msg.to} body=${msg.body}`);
    return { providerMessageId: undefined };
  }
  const result = await c.messages.create({
    from: `whatsapp:${env.twilio.from}`,
    to: `whatsapp:${msg.to}`,
    body: msg.body,
  });
  return { providerMessageId: result.sid };
}
