import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  excerpt: z.string().max(300).optional(),
  content: z.string().min(1),
  image: z.string().url().optional(),
  category: z.string().min(1).max(100),
  tags: z.array(z.string().min(1).max(50)).optional(),
  author: z.string().min(1).max(100),
  status: z.enum(['draft', 'published']).default('draft'),
});

export const updatePostSchema = createPostSchema.partial();

export type CreatePostDTO = z.infer<typeof createPostSchema>;
export type UpdatePostDTO = z.infer<typeof updatePostSchema>;

export const createCMSPageSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  seoTitle: z.string().max(200).optional(),
  seoDescription: z.string().max(300).optional(),
  status: z.enum(['draft', 'published']).default('draft'),
});

export const updateCMSPageSchema = createCMSPageSchema.partial();

export type CreateCMSPageDTO = z.infer<typeof createCMSPageSchema>;
export type UpdateCMSPageDTO = z.infer<typeof updateCMSPageSchema>;

const ingredientCategory = z.enum([
  'greens', 'berries', 'adaptogens', 'probiotics', 'vitamins', 'omegas', 'enzymes', 'antioxidants',
]);

export const createIngredientSchema = z.object({
  name: z.string().min(1).max(150),
  amount: z.string().min(1).max(50),
  benefit: z.string().min(1).max(200),
  description: z.string().min(1),
  image: z.string().max(500).optional(),
  category: ingredientCategory,
  clinicalBacking: z.string().max(500).optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateIngredientSchema = createIngredientSchema.partial();

export type CreateIngredientDTO = z.infer<typeof createIngredientSchema>;
export type UpdateIngredientDTO = z.infer<typeof updateIngredientSchema>;

export const createTestimonialSchema = z.object({
  name: z.string().min(1).max(150),
  title: z.string().max(150).optional(),
  type: z.enum(['expert', 'customer']),
  body: z.string().min(1).max(1000),
  rating: z.number().min(1).max(5).optional(),
  image: z.string().max(500).optional(),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateTestimonialSchema = createTestimonialSchema.partial();

export type CreateTestimonialDTO = z.infer<typeof createTestimonialSchema>;
export type UpdateTestimonialDTO = z.infer<typeof updateTestimonialSchema>;

export const createFAQSchema = z.object({
  question: z.string().min(1).max(300),
  answer: z.string().min(1).max(2000),
  order: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export const updateFAQSchema = createFAQSchema.partial();

export type CreateFAQDTO = z.infer<typeof createFAQSchema>;
export type UpdateFAQDTO = z.infer<typeof updateFAQSchema>;
