'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createPage, updatePage, deletePage, getAdminPage, createPagePreviewToken, updatePageNavigation, restorePageRevision, type CMSPageInput, type CMSPageSummary,
  createIngredient, updateIngredient, deleteIngredient, type IngredientInput,
  createTestimonial, updateTestimonial, deleteTestimonial, type TestimonialInput,
  createFAQ, updateFAQ, deleteFAQ, type FAQInput,
  listAdminIngredients, listAdminTestimonials,
} from '@/lib/content'
import { updateHeroSection,type HeroSection,updateAnnouncementBar,type AnnouncementBarSection,updatePrebookingModal,type PrebookingModalSection,updatePopupBanner,type PopupBannerSection,updateOurStorySection,type OurStorySection,updateWhyFuylSection,type WhyFuylSection,updatePrivacyPolicySection,updateShippingPolicySection,updateCancellationReturnsSection,updateTermsConditionsSection,type LegalPageSection } from '@/lib/content'
import { adminApiFetch, getErrorMessage } from '@/lib/api'
import type { SignatureResult } from '@/lib/upload'

export type ContentActionState = { error: string; success?: never; id?: never } | { success: true; id?: string; error?: never } | null

// Same signature-then-direct-to-Cloudinary flow as the blog/product uploaders.
export async function getContentImageUploadSignature(): Promise<SignatureResult> {
  try {
    return await adminApiFetch('/uploads/sign', { method: 'POST', body: { folder: 'content', resourceType: 'image' } })
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not authorize the upload.') }
  }
}
export async function getContentVideoUploadSignature(): Promise<SignatureResult> {
  try {
    return await adminApiFetch('/uploads/sign', { method: 'POST', body: { folder: 'content', resourceType: 'video' } })
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not authorize the upload.') }
  }
}
export async function updateHeroAction(input:HeroSection):Promise<{error?:string}>{try{await updateHeroSection(input);revalidatePath('/content/hero');return{}}catch(err){return{error:getErrorMessage(err,'Could not save hero section.')}}}
export async function updateAnnouncementBarAction(input:AnnouncementBarSection):Promise<{error?:string}>{try{await updateAnnouncementBar(input);revalidatePath('/content/announcement');return{}}catch(err){return{error:getErrorMessage(err,'Could not save announcement bar.')}}}
export async function updatePrebookingModalAction(input:PrebookingModalSection):Promise<{error?:string}>{try{await updatePrebookingModal(input);revalidatePath('/content/prebooking-modal');return{}}catch(err){return{error:getErrorMessage(err,'Could not save prebooking modal.')}}}
export async function updatePopupBannerAction(input:PopupBannerSection):Promise<{error?:string}>{try{await updatePopupBanner(input);revalidatePath('/content/popup-banner');return{}}catch(err){return{error:getErrorMessage(err,'Could not save popup banner.')}}}
export async function updateOurStoryAction(input: OurStorySection): Promise<{error?:string}> { try { await updateOurStorySection(input); revalidatePath('/content/our-story'); return {} } catch(err) { return { error: getErrorMessage(err,'Could not save Our Story page.') } } }
export async function updateWhyFuylAction(input: WhyFuylSection): Promise<{error?:string}> { try { await updateWhyFuylSection(input); revalidatePath('/content/why-fuyl'); return {} } catch(err) { return { error: getErrorMessage(err,'Could not save Why FUYL page.') } } }
export async function updatePrivacyPolicyAction(input: LegalPageSection): Promise<{error?:string}> { try { await updatePrivacyPolicySection(input); revalidatePath('/content/privacy-policy'); return {} } catch(err) { return { error: getErrorMessage(err,'Could not save Privacy Policy.') } } }
export async function updateShippingPolicyAction(input: LegalPageSection): Promise<{error?:string}> { try { await updateShippingPolicySection(input); revalidatePath('/content/shipping-policy'); return {} } catch(err) { return { error: getErrorMessage(err,'Could not save Shipping Policy.') } } }
export async function updateCancellationReturnsAction(input: LegalPageSection): Promise<{error?:string}> { try { await updateCancellationReturnsSection(input); revalidatePath('/content/cancellation-returns'); return {} } catch(err) { return { error: getErrorMessage(err,'Could not save Cancellation & Returns.') } } }
export async function updateTermsConditionsAction(input: LegalPageSection): Promise<{error?:string}> { try { await updateTermsConditionsSection(input); revalidatePath('/content/terms-conditions'); return {} } catch(err) { return { error: getErrorMessage(err,'Could not save Terms & Conditions.') } } }
export async function reorderIngredientAction(id:string,direction:'up'|'down'){const items=await listAdminIngredients();const index=items.findIndex(i=>i.id===id),target=direction==='up'?index-1:index+1;if(index<0||target<0||target>=items.length)return;await Promise.all([adminApiFetch(`/admin/content/ingredients/${id}`,{method:'PATCH',body:{order:items[target].order}}),adminApiFetch(`/admin/content/ingredients/${items[target].id}`,{method:'PATCH',body:{order:items[index].order}})]);revalidatePath('/content')}
export async function reorderTestimonialAction(id:string,direction:'up'|'down'){const items=await listAdminTestimonials();const index=items.findIndex(i=>i.id===id),target=direction==='up'?index-1:index+1;if(index<0||target<0||target>=items.length)return;await Promise.all([adminApiFetch(`/admin/content/testimonials/${id}`,{method:'PATCH',body:{order:items[target].order}}),adminApiFetch(`/admin/content/testimonials/${items[target].id}`,{method:'PATCH',body:{order:items[index].order}})]);revalidatePath('/content')}

// ─── Pages ──────────────────────────────────────────────────────────────────
export async function createPageAction(input: CMSPageInput): Promise<ContentActionState> {
  let id: string
  try {
    id = await createPage(input)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not create the page.') }
  }
  revalidatePath('/content')
  return { success: true, id }
}

export async function updatePageAction(id: string, input: CMSPageInput): Promise<ContentActionState> {
  try {
    await updatePage(id, input)
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not save changes.') }
  }
  revalidatePath('/content')
  revalidatePath(`/content/pages/${id}`)
  return { success: true, id }
}

export async function duplicatePageAction(id: string): Promise<void> {
  const page = await getAdminPage(id)
  if (!page) return
  const copyId = await createPage({
    title: `${page.title} Copy`, body: page.body, seoTitle: page.seoTitle,
    seoDescription: page.seoDescription, status: 'draft', navigationPlacement: 'none',
    navigationLabel: '', navigationOrder: 0,
  })
  revalidatePath('/content')
  redirect(`/content/pages/${copyId}`)
}

export async function createPagePreviewAction(id: string): Promise<{ url?: string; error?: string }> {
  try {
    const token = await createPagePreviewToken(id)
    const storefront = (process.env.STOREFRONT_URL ?? 'https://fuyl.in').replace(/\/$/, '')
    return { url: `${storefront}/preview/pages/${id}?token=${encodeURIComponent(token)}` }
  } catch (err) { return { error: getErrorMessage(err, 'Could not create a preview link.') } }
}

export async function updatePageNavigationAction(items: Array<Pick<CMSPageSummary, 'id' | 'navigationPlacement' | 'navigationLabel' | 'navigationOrder'>>): Promise<{ error?: string; success?: true }> {
  try {
    await updatePageNavigation(items)
    revalidatePath('/content')
    revalidatePath('/content/navigation')
    return { success: true }
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not update website navigation.') }
  }
}

export async function restorePageRevisionAction(id: string, revisionId: string): Promise<{ error?: string; success?: true }> {
  try {
    await restorePageRevision(id, revisionId)
    revalidatePath('/content')
    revalidatePath(`/content/pages/${id}`)
    return { success: true }
  } catch (err) {
    return { error: getErrorMessage(err, 'Could not restore this version.') }
  }
}

export async function deletePageAction(id: string): Promise<void> {
  await deletePage(id)
  revalidatePath('/content')
  redirect('/content?tab=pages')
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
  try {
    await deleteIngredient(id)
    revalidatePath('/content')
  } catch { /* redirect without revalidating on failure */ }
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
  try {
    await deleteTestimonial(id)
    revalidatePath('/content')
  } catch { /* redirect without revalidating on failure */ }
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
  try {
    await deleteFAQ(id)
    revalidatePath('/content')
  } catch { /* redirect without revalidating on failure */ }
  redirect('/content?tab=faqs')
}
