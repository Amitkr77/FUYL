import { apiFetch } from './client'

export type UploadFolder = 'products' | 'blog' | 'avatars' | 'reviews' | 'returns'

export interface UploadSignature {
  timestamp: number
  signature: string
  apiKey:    string
  cloudName: string
  folder:    string
  uploadUrl: string
}

// POST /uploads/sign — any authenticated customer can request one (not
// admin-only); `folder` just scopes where the file lands in Cloudinary.
export async function getUploadSignature(token: string, folder: UploadFolder): Promise<UploadSignature> {
  return apiFetch<UploadSignature>('/uploads/sign', {
    method: 'POST',
    token,
    body: { folder },
  })
}
