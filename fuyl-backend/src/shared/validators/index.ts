import { z } from 'zod';

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId')
  .or(z.instanceof(Object));

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export const uuidSchema = z.string().uuid();

export const emailSchema = z.string().email();

export const phoneSchema = z.string().regex(/^\+?[1-9]\d{7,14}$/);

export const moneySchema = z.number().nonnegative().multipleOf(0.01);
