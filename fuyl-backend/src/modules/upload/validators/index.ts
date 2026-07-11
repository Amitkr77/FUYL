import { z } from 'zod';

export const signUploadSchema = z.object({
  folder: z.enum(['products', 'blog', 'avatars', 'reviews']),
});

export type SignUploadDTO = z.infer<typeof signUploadSchema>;
