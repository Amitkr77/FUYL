import { z } from 'zod';

export const contactMessageSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().max(30).optional(),
  topic: z.string().max(100).optional(),
  message: z.string().min(1).max(5000),
});

export const newsletterSubscribeSchema = z.object({
  email: z.string().email().max(200),
});

export type ContactMessageDTO = z.infer<typeof contactMessageSchema>;
export type NewsletterSubscribeDTO = z.infer<typeof newsletterSubscribeSchema>;
