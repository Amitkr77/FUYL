import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
  parentId: z.string().length(24).optional(),
  imageUrl: z.string().url().optional(),
  iconUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  seo: z.object({
    metaTitle: z.string().max(200).optional(),
    metaDescription: z.string().max(500).optional(),
    keywords: z.array(z.string()).optional(),
  }).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const createAttributeSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  type: z.enum(['text', 'number', 'boolean', 'select', 'multiselect', 'date']),
  options: z.array(z.string()).optional(),
  unit: z.string().max(20).optional(),
  isFilterable: z.boolean().default(true),
  isRequired: z.boolean().default(false),
});

export const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
});

export const createCollectionSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(),
  imageUrl: z.string().url().optional(),
  rules: z.array(z.object({
    field: z.string(),
    operator: z.enum(['eq', 'ne', 'in', 'lt', 'gt', 'lte', 'gte']),
    value: z.union([z.string(), z.number(), z.array(z.string())]),
  })).default([]),
  matchType: z.enum(['all', 'any']).default('all'),
  isActive: z.boolean().default(true),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
});

export const createProductSchema = z.object({
  name: z.string().min(2).max(200),
  shortDescription: z.string().max(280).optional(),
  description: z.string().max(10000).optional(),
  brand: z.string().max(100).optional(),
  sellerId: z.string().length(24),
  categoryIds: z.array(z.string().length(24)).default([]),
  collectionIds: z.array(z.string().length(24)).optional(),
  tagIds: z.array(z.string().length(24)).optional(),
  attributeValues: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])).default({}),
  media: z.array(z.object({
    url: z.string().url(),
    type: z.enum(['image', 'video', 'pdf']).default('image'),
    alt: z.string().max(200).optional(),
    position: z.number().int().default(0),
    isPrimary: z.boolean().default(false),
  })).default([]),
  seo: z.object({
    metaTitle: z.string().max(200).optional(),
    metaDescription: z.string().max(500).optional(),
    slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
    keywords: z.array(z.string()).optional(),
  }),
  basePrice: z.number().min(0),
  salePrice: z.number().min(0).optional(),
  compareAtPrice: z.number().min(0).optional(),
  additionalPrices: z.array(z.object({
    label: z.string().min(1).max(60),
    price: z.number().min(0),
  })).optional(),
  unitPrice: z.object({
    value: z.number().min(0),
    unit: z.string().min(1).max(40),
  }).optional(),
  isTaxable: z.boolean().default(true),
  costPerItem: z.number().min(0).optional(),
  currency: z.string().default('INR'),
  isSubscribable: z.boolean().default(false),
  isBundle: z.boolean().default(false),
  bundleProductIds: z.array(z.string().length(24)).optional(),
  ingredients: z.array(z.string()).optional(),
  benefits: z.array(z.string()).optional(),
  faqs: z.array(z.object({
    question: z.string().min(1).max(300),
    answer: z.string().min(1).max(2000),
  })).optional(),
  supplementInfo: z.object({
    ageGroup: z.string().max(100).optional(),
    dietaryUse: z.string().max(100).optional(),
    flavor: z.string().max(100).optional(),
    ingredientCategory: z.string().max(100).optional(),
    routeOfAdministration: z.string().max(100).optional(),
    healthFocus: z.array(z.string()).optional(),
  }).optional(),
  certifications: z.array(z.object({
    label: z.string().min(1).max(100),
    logoUrl: z.string().url(),
  })).optional(),
  status: z.enum(['active', 'draft', 'archived']).default('draft'),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
});

export const updateProductSchema = createProductSchema.partial();

export const createVariantSchema = z.object({
  productId: z.string().length(24),
  sku: z.string().min(1).max(50),
  name: z.string().min(1).max(200),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  price: z.number().min(0),
  salePrice: z.number().min(0).optional(),
  compareAtPrice: z.number().min(0).optional(),
  currency: z.string().default('INR'),
  weight: z.number().min(0).optional(),
  weightUnit: z.string().max(10).default('g'),
  barcode: z.string().max(50).optional(),
  isActive: z.boolean().default(true),
  isSubscribable: z.boolean().default(true),
});

export const updateVariantSchema = createVariantSchema.partial();

export type CreateCategoryDTO = z.infer<typeof createCategorySchema>;
export type UpdateCategoryDTO = z.infer<typeof updateCategorySchema>;
export type CreateAttributeDTO = z.infer<typeof createAttributeSchema>;
export type CreateTagDTO = z.infer<typeof createTagSchema>;
export type CreateCollectionDTO = z.infer<typeof createCollectionSchema>;
export type CreateProductDTO = z.infer<typeof createProductSchema>;
export type UpdateProductDTO = z.infer<typeof updateProductSchema>;
export type CreateVariantDTO = z.infer<typeof createVariantSchema>;
export type UpdateVariantDTO = z.infer<typeof updateVariantSchema>;
