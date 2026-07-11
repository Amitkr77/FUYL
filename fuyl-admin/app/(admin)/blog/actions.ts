'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createPost, updatePost, deletePost, AdminApiError, type BlogPostInput } from '@/lib/blog'
import { adminApiFetch } from '@/lib/api'
import type { SignatureResult } from '@/lib/upload'

export type BlogActionState = { error: string } | null

// Same signature-then-direct-to-Cloudinary flow as the product image
// uploader (getProductImageUploadSignature) — just a different folder.
export async function getBlogImageUploadSignature(): Promise<SignatureResult> {
  try {
    return await adminApiFetch('/uploads/sign', { method: 'POST', body: { folder: 'blog' } })
  } catch (err) {
    return { error: err instanceof AdminApiError ? err.message : 'Could not authorize the upload.' }
  }
}

export async function createPostAction(input: BlogPostInput): Promise<BlogActionState> {
  try {
    await createPost(input)
  } catch (err) {
    return { error: err instanceof AdminApiError ? err.message : 'Could not create the post.' }
  }
  revalidatePath('/blog')
  redirect('/blog')
}

export async function updatePostAction(id: string, input: BlogPostInput): Promise<BlogActionState> {
  try {
    await updatePost(id, input)
  } catch (err) {
    return { error: err instanceof AdminApiError ? err.message : 'Could not save changes.' }
  }
  revalidatePath('/blog')
  revalidatePath(`/blog/${id}`)
  redirect('/blog')
}

export async function deletePostAction(id: string): Promise<void> {
  await deletePost(id)
  revalidatePath('/blog')
  redirect('/blog')
}
