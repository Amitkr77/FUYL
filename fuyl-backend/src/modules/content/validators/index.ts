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
  navigationPlacement: z.enum(['none', 'header', 'footer', 'both']).default('none'),
  navigationLabel: z.string().max(80).optional(),
  navigationOrder: z.number().int().min(0).default(0),
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
  navigationPlacement: z.enum(['none', 'header', 'footer', 'both']).default('none'),
  navigationLabel: z.string().trim().max(80).optional(),
  navigationOrder: z.number().int().min(0).default(0),
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

const contentLink = z.string().trim().max(500).refine(
  (value) => !value || value.startsWith('/') || value.startsWith('#') || /^(https?:|mailto:|tel:)/i.test(value),
  'Must be an internal path or a valid web, email, or telephone URL'
);
const assetPath = z.string().trim().max(1000);
const shortText = z.string().trim().max(300);
const requiredText = z.string().trim().min(1).max(5000);
const sectionEnvelope = <T extends z.ZodTypeAny>(data: T) => z.object({
  title: z.string().trim().min(1).max(150),
  isActive: z.boolean(),
  data,
});

const heroSchema = sectionEnvelope(z.object({
  autoplayMs: z.number().int().min(1000).max(60000),
  slides: z.array(z.object({
    id: z.string().trim().min(1).max(100),
    eyebrow: shortText,
    headline: requiredText,
    subheading: z.string().trim().max(1000),
    mediaType: z.enum(['image', 'video']),
    image: assetPath,
    imageAlt: z.string().trim().max(300),
    video: assetPath,
    isActive: z.boolean(),
    primaryCtaLabel: z.string().trim().max(100),
    primaryCtaHref: contentLink,
    secondaryCtaLabel: z.string().trim().max(100).optional(),
    secondaryCtaHref: contentLink.optional(),
  })).max(20),
}));
const announcementSchema = sectionEnvelope(z.object({
  text: requiredText.max(500), linkHref: contentLink, linkText: shortText, dismissible: z.boolean(),
}));
const prebookingSchema = sectionEnvelope(z.object({
  floatingButtonLabel: shortText, delayMs: z.number().int().min(0).max(300000), capacity: z.number().int().min(1).max(10000000),
  badge: shortText, headline: requiredText.max(500), description: requiredText.max(2000), submitButtonLabel: shortText,
  privacyNote: z.string().trim().max(1000), showDonation: z.boolean(), donationLabel: shortText,
  donationSublabel: z.string().trim().max(1000), donationQrUrl: assetPath, successHeadline: requiredText.max(500),
  successDescription: requiredText.max(2000), whatsappButtonLabel: shortText, continueShoppingLabel: shortText,
}));
const popupSchema = sectionEnvelope(z.object({
  title: z.string().trim().max(300), body: z.string().trim().max(3000), imageUrl: assetPath,
  ctaLabel: shortText, ctaHref: contentLink, delayMs: z.number().int().min(0).max(300000),
  frequency: z.enum(['always', 'once_per_session', 'once_ever']),
}));
const ourStorySchema = sectionEnvelope(z.object({
  heroQuote: requiredText.max(2000),
  founders: z.array(z.object({ image: assetPath, name: requiredText.max(200), bio: requiredText.max(5000) })).max(20),
  milestones: z.array(z.object({ title: requiredText.max(300), body: requiredText.max(5000) })).max(50),
  ctaLabel: shortText, ctaHref: contentLink,
}));
const whyFuylSchema = sectionEnvelope(z.object({
  heroHeadline: requiredText.max(500), heroDescription: requiredText.max(5000), heroImage: assetPath,
  ctaLabel: shortText, ctaHref: contentLink, pillarsHeadline: requiredText.max(500), pillarsSubheadline: z.string().trim().max(1000),
}));
const legalSchema = sectionEnvelope(z.object({
  lastUpdated: shortText, subtitle: z.string().trim().max(1000),
  sections: z.array(z.object({ heading: requiredText.max(500), body: requiredText.max(10000), isList: z.boolean() })).max(100),
}));

export const storefrontSectionSchemas: Record<string, z.ZodTypeAny> = {
  'home-hero': heroSchema,
  'announcement-bar': announcementSchema,
  'prebooking-modal': prebookingSchema,
  'popup-banner': popupSchema,
  'page-our-story': ourStorySchema,
  'page-why-fuyl': whyFuylSchema,
  'page-privacy-policy': legalSchema,
  'page-shipping-policy': legalSchema,
  'page-cancellation-returns': legalSchema,
  'page-terms-conditions': legalSchema,
};
