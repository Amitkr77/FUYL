'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createAdminProduct,
  updateAdminProduct,
  archiveAdminProduct,
  type AdminProductInput,
} from '@/lib/products'
import { adminApiFetch, AdminApiError } from '@/lib/api'
import type { SignatureResult } from '@/lib/upload'

export type ProductActionState = { error: string } | null

// Called from the client before the actual file upload — the signature
// itself must be minted server-side (it needs the Cloudinary API secret),
// but the file bytes go straight from the browser to Cloudinary afterward.
export async function getProductImageUploadSignature(): Promise<SignatureResult> {
  try {
    return await adminApiFetch('/uploads/sign', { method: 'POST', body: { folder: 'products' } })
  } catch (err) {
    return { error: err instanceof AdminApiError ? err.message : 'Could not authorize the upload.' }
  }
}

export async function createProductAction(input: AdminProductInput): Promise<ProductActionState> {
  try {
    await createAdminProduct(input)
  } catch (err) {
    return { error: err instanceof AdminApiError ? err.message : 'Could not create the product.' }
  }
  revalidatePath('/products')
  redirect('/products')
}

export async function updateProductAction(id: string, input: AdminProductInput): Promise<ProductActionState> {
  try {
    await updateAdminProduct(id, input)
  } catch (err) {
    return { error: err instanceof AdminApiError ? err.message : 'Could not save changes.' }
  }
  revalidatePath('/products')
  revalidatePath(`/products/${id}`)
  redirect('/products')
}

export async function archiveProductAction(id: string): Promise<ProductActionState> {
  try {
    await archiveAdminProduct(id)
  } catch (err) {
    return { error: err instanceof AdminApiError ? err.message : 'Could not archive the product.' }
  }
  revalidatePath('/products')
  redirect('/products')
}
