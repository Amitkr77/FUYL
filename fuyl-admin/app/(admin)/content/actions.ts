'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createPage, updatePage, deletePage, type CMSPageInput,
  createIngredient, updateIngredient, deleteIngredient, type IngredientInput,
  createTestimonial, updateTestimonial, deleteTestimonial, type TestimonialInput,
  createFAQ, updateFAQ, deleteFAQ, type FAQInput,
} from '@/lib/content'
import { adminApiFetch, getErrorMessage } from '@/lib/api'
import type { SignatureResult } from '@/lib/upload'

export type ContentActionState = { error: string } | null

// Same signature-then-direct-to-Cloudinary flow as the blog/product uploaders.
export async function getContentImageUploadSignature(): Promise<SignatureResult> {
  try {
    return await adminApiFetch('/uploads/sign', { method: 'POST', body: { folder: 'content' } })
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not authorize the upload.') }
  }
}

// ─── Pages ──────────────────────────────────────────────────────────────────
export async function createPageAction(input: CMSPageInput): Promise<ContentActionState> {
  try {
    await createPage(input)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not create the page.') }
  }
  revalidatePath('/content')
  redirect('/content')
}

export async function updatePageAction(id: string, input: CMSPageInput): Promise<ContentActionState> {
  try {
    await updatePage(id, input)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not save changes.') }
  }
  revalidatePath('/content')
  revalidatePath(`/content/pages/${id}`)
  redirect('/content')
}

export async function deletePageAction(id: string): Promise<void> {
  await deletePage(id)
  revalidatePath('/content')
  redirect('/content')
}

// ─── Ingredients ────────────────────────────────────────────────────────────
export async function createIngredientAction(input: IngredientInput): Promise<ContentActionState> {
  try {
    await createIngredient(input)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not create the ingredient.') }
  }
  revalidatePath('/content')
  redirect('/content?tab=ingredients')
}

export async function updateIngredientAction(id: string, input: IngredientInput): Promise<ContentActionState> {
  try {
    await updateIngredient(id, input)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not save changes.') }
  }
  revalidatePath('/content')
  revalidatePath(`/content/ingredients/${id}`)
  redirect('/content?tab=ingredients')
}

export async function deleteIngredientAction(id: string): Promise<void> {
  await deleteIngredient(id)
  revalidatePath('/content')
  redirect('/content?tab=ingredients')
}

// ─── Testimonials ───────────────────────────────────────────────────────────
export async function createTestimonialAction(input: TestimonialInput): Promise<ContentActionState> {
  try {
    await createTestimonial(input)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not create the testimonial.') }
  }
  revalidatePath('/content')
  redirect('/content?tab=testimonials')
}

export async function updateTestimonialAction(id: string, input: TestimonialInput): Promise<ContentActionState> {
  try {
    await updateTestimonial(id, input)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not save changes.') }
  }
  revalidatePath('/content')
  revalidatePath(`/content/testimonials/${id}`)
  redirect('/content?tab=testimonials')
}

export async function deleteTestimonialAction(id: string): Promise<void> {
  await deleteTestimonial(id)
  revalidatePath('/content')
  redirect('/content?tab=testimonials')
}

// ─── FAQs ───────────────────────────────────────────────────────────────────
export async function createFAQAction(input: FAQInput): Promise<ContentActionState> {
  try {
    await createFAQ(input)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not create the FAQ.') }
  }
  revalidatePath('/content')
  redirect('/content?tab=faqs')
}

export async function updateFAQAction(id: string, input: FAQInput): Promise<ContentActionState> {
  try {
    await updateFAQ(id, input)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not save changes.') }
  }
  revalidatePath('/content')
  revalidatePath(`/content/faqs/${id}`)
  redirect('/content?tab=faqs')
}

export async function deleteFAQAction(id: string): Promise<void> {
  await deleteFAQ(id)
  revalidatePath('/content')
  redirect('/content?tab=faqs')
}
