import { z } from 'zod';

export function normalizeIndianMobile(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  let digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : value.trim();
}

const indianMobileSchema = z.preprocess(
  normalizeIndianMobile,
  z.string().regex(/^\+91[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
);

export const contactMessageSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().max(30).optional(),
  topic: z.string().max(100).optional(),
  message: z.string().min(1).max(5000),
});

export const newsletterSubscribeSchema = z.object({
  email: z.string().email().max(200),
  // Optional hint for where the signup came from (footer form, popup, etc.).
  source: z.string().max(100).optional(),
});

export const prebookingLeadSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: indianMobileSchema,
  source: z.string().max(100).optional(),
  wantsToDonate: z.boolean().optional().default(false),
});

export const newsletterVerifySchema = z.object({
  token: z.string().min(10).max(200),
});

export const newsletterUnsubscribeSchema = z.object({
  token: z.string().min(10).max(200),
});

export const newsletterResendSchema = z.object({
  email: z.string().email().max(200),
});

export type ContactMessageDTO = z.infer<typeof contactMessageSchema>;
export type NewsletterSubscribeDTO = z.infer<typeof newsletterSubscribeSchema>;
export type NewsletterVerifyDTO = z.infer<typeof newsletterVerifySchema>;
export type NewsletterUnsubscribeDTO = z.infer<typeof newsletterUnsubscribeSchema>;
export type NewsletterResendDTO = z.infer<typeof newsletterResendSchema>;
export type PrebookingLeadDTO = z.infer<typeof prebookingLeadSchema>;
