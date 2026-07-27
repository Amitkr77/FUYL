'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createAdminCategory,
  updateAdminCategory,
  setAdminCategoryActive,
  type AdminCategoryInput,
} from '@/lib/categories'
import { adminApiFetch, getErrorMessage } from '@/lib/api'
import type { SignatureResult } from '@/lib/upload'

export type CategoryActionState = { error: string } | null

export async function getCategoryImageUploadSignature(): Promise<SignatureResult> {
  try {
    return await adminApiFetch('/uploads/sign', { method: 'POST', body: { folder: 'categories' } })
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not authorize the upload.') }
  }
}

export async function createCategoryAction(input: AdminCategoryInput): Promise<CategoryActionState> {
  try {
    await createAdminCategory(input)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not create the category.') }
  }
  revalidatePath('/categories')
  redirect('/categories')
}

export async function updateCategoryAction(id: string, input: AdminCategoryInput): Promise<CategoryActionState> {
  try {
    await updateAdminCategory(id, input)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not save changes.') }
  }
  revalidatePath('/categories')
  revalidatePath(`/categories/${id}`)
  redirect('/categories')
}

export async function setCategoryActiveAction(id: string, isActive: boolean): Promise<CategoryActionState> {
  try {
    await setAdminCategoryActive(id, isActive)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not update the category.') }
  }
  revalidatePath('/categories')
  return null
}
