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

// BUG FIXED (found live — reported as checkout-identify 400ing on a phone
// number that had just been accepted, unchanged, by the checkout address
// form): the address form's phone field validated loosely (min/max length
// only), while identity/order modules each inlined this same strict
// digits-only regex — so a perfectly normal "98765 43210" (space-grouped)
// or "09876543210" (domestic leading 0) passed the address form but was
// then rejected the instant that exact string reached account creation.
// Normalizing here (stripping formatting punctuation, dropping a lone
// leading 0 in front of what's otherwise a 10-digit number — a domestic
// dialing prefix, not part of the number, for this India-only storefront)
// before the regex check means every caller of this shared schema accepts
// the same real-world input consistently instead of each enforcing its own
// stricter or looser rule.
function normalizePhoneValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  const stripped = value.replace(/[\s\-().]/g, '');
  if (!stripped.startsWith('+') && stripped.length === 11 && stripped.startsWith('0')) {
    return stripped.slice(1);
  }
  return stripped;
}

export const phoneSchema = z.preprocess(
  normalizePhoneValue,
  z.string().regex(/^\+?[1-9]\d{7,14}$/, 'Enter a valid phone number')
);

export const moneySchema = z.number().nonnegative().multipleOf(0.01);
