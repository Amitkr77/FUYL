import { z } from 'zod';

export const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.enum(['male', 'female', 'other', 'undisclosed']).optional(),
  preferredLanguage: z.string().max(10).optional(),
  preferredCurrency: z.string().max(3).optional(),
  marketingOptIn: z.boolean().optional(),
  defaultSubscriptionInterval: z.enum(['daily', 'weekly', 'biweekly', 'monthly', 'quarterly']).optional(),
  defaultSubscriptionDiscountPercent: z.number().min(0).max(100).optional(),
});

export const addressSchema = z.object({
  label: z.string().min(1).max(40),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(3).max(20),
  country: z.string().min(2).max(3).default('IN'),
  phone: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isDefault: z.boolean().default(false),
  isBilling: z.boolean().default(false),
  isShipping: z.boolean().default(true),
  deliveryInstructions: z.string().max(500).optional(),
});

export const wishlistItemSchema = z.object({
  productId: z.string().length(24),
  variantId: z.string().length(24).optional(),
});

export type UpdateProfileDTO = z.infer<typeof updateProfileSchema>;
export type AddressDTO = z.infer<typeof addressSchema>;
export type WishlistItemDTO = z.infer<typeof wishlistItemSchema>;
