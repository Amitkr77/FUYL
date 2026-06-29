import { env } from '../../../config/env';

/**
 * Build a shareable deep link for a referral code.
 * Format: {CLIENT_URL}/ref/{code}
 */
export function buildShareLink(code: string): string {
  return `${env.clientUrl}/ref/${code}`;
}

export function buildWhatsAppMessage(code: string, referrerName?: string): string {
  const link = buildShareLink(code);
  const name = referrerName ? `${referrerName} ` : '';
  return `Hey! ${name}invited you to Fuyl. Use my code ${code} to get ₹${env.referral.defaultRefereeReward} off your first order! ${link}`;
}

export function buildEmailSubject(): string {
  return 'You\'ve been invited to Fuyl 🎁';
}

export function buildEmailBody(code: string, referrerName?: string): string {
  const link = buildShareLink(code);
  const name = referrerName ? `${referrerName} ` : '';
  return `Hi!\n\n${name}invited you to Fuyl. Use the code ${code} at signup to get ₹${env.referral.defaultRefereeReward} wallet credit on your first order.\n\nClick here: ${link}\n\nHappy shopping!\nFuyl Team`;
}

export function buildSmsMessage(code: string): string {
  const link = buildShareLink(code);
  return `You're invited to Fuyl! Use code ${code} for ₹${env.referral.defaultRefereeReward} off your first order. ${link}`;
}
