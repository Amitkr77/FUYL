import { z } from 'zod';

export const templateSchema = z.object({
  name: z.string().min(2).max(80).regex(/^[a-z0-9_]+$/, 'Name must be lowercase snake_case'),
  channel: z.enum(['email', 'sms', 'whatsapp', 'push']),
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(20000),
  description: z.string().max(500).optional(),
});

export const updateTemplateSchema = z.object({
  subject: z.string().max(200).optional(),
  body: z.string().min(1).max(20000).optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const preferenceSchema = z.object({
  email: z.enum(['enabled', 'disabled']).optional(),
  sms: z.enum(['enabled', 'disabled']).optional(),
  whatsapp: z.enum(['enabled', 'disabled']).optional(),
  push: z.enum(['enabled', 'disabled']).optional(),
});

export const categoryOverrideSchema = z.object({
  category: z.string().min(1).max(40),
  preference: z.enum(['enabled', 'disabled']),
});

export type TemplateDTO = z.infer<typeof templateSchema>;
export type UpdateTemplateDTO = z.infer<typeof updateTemplateSchema>;
export type PreferenceDTO = z.infer<typeof preferenceSchema>;
export type CategoryOverrideDTO = z.infer<typeof categoryOverrideSchema>;
