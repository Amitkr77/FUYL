import { z } from 'zod';

export const signUploadSchema = z.object({
  folder: z.enum(['products', 'blog', 'avatars', 'reviews', 'returns', 'categories', 'content']),
  resourceType: z.enum(['image', 'video']).optional().default('image'),
});

export type SignUploadDTO = z.infer<typeof signUploadSchema>;
