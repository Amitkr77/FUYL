import { adminApiFetch, adminApiFetchPaginated, AdminApiError, type PaginationMeta } from './api'

export type ContentStatus = 'draft' | 'published'
export interface StorefrontSectionRevision { revisionId:string; title:string; isActive:boolean; savedAt:string }
export async function listStorefrontSectionRevisions(key:string):Promise<StorefrontSectionRevision[]>{return adminApiFetch(`/admin/content/storefront-sections/${key}/revisions`)}
export async function restoreStorefrontSectionRevision(key:string,revisionId:string):Promise<void>{await adminApiFetch(`/admin/content/storefront-sections/${key}/revisions/${revisionId}/restore`,{method:'POST'})}
export interface HeroSlide {id:string;eyebrow:string;headline:string;subheading:string;mediaType:'image'|'video';image:string;imageAlt:string;video:string;isActive:boolean;primaryCtaLabel:string;primaryCtaHref:string;secondaryCtaLabel?:string;secondaryCtaHref?:string}
export interface HeroSection {title:string;isActive:boolean;data:{autoplayMs:number;slides:HeroSlide[]}}
export async function getHeroSection():Promise<HeroSection>{const raw=await adminApiFetch<({_id?:string}|null)&Partial<HeroSection>>('/admin/content/storefront-sections/home-hero');return{title:raw?.title??'Homepage hero',isActive:raw?.isActive??true,data:raw?.data??{autoplayMs:5000,slides:[{id:'hero-1',mediaType:'image',eyebrow:'Introducing FUYL COMPLETE+',headline:'Nourish Daily.\nFeel Stronger.\nLive longer.',subheading:'A Daily Nutrition Powder.',image:'/images/hero-slide-1.webp',imageAlt:'FUYL Complete daily nutrition',video:'',isActive:true,primaryCtaLabel:'SHOP FUYL COMPLETE +',primaryCtaHref:'/products/fuyl-complete'},{id:'hero-2',mediaType:'image',eyebrow:'30-Day Transformation',headline:'One Sachet\nEvery Morning\nEverything covered.',subheading:'Built For Daily Life And Long Term Health.',image:'/images/hero-slide-2.webp',imageAlt:'FUYL daily sachet',video:'',isActive:true,primaryCtaLabel:'START TODAY',primaryCtaHref:'/products/fuyl-complete'}]}}}
export async function updateHeroSection(input:HeroSection):Promise<void>{await adminApiFetch('/admin/content/storefront-sections/home-hero',{method:'PUT',body:input})}

// ─── Announcement Bar ────────────────────────────────────────────────────────
export interface AnnouncementBarData{text:string;linkHref:string;linkText:string;dismissible:boolean}
export interface AnnouncementBarSection{isActive:boolean;data:AnnouncementBarData}
const ANNOUNCEMENT_BAR_DEFAULTS:AnnouncementBarData={text:'FUYL COMPLETE+ LAUNCHING SOON — JOIN THE WAITLIST FOR EARLY ACCESS',linkHref:'/pages/contact',linkText:'',dismissible:true}
export async function getAnnouncementBar():Promise<AnnouncementBarSection>{const raw=await adminApiFetch<({_id?:string}|null)&Partial<AnnouncementBarSection>>('/admin/content/storefront-sections/announcement-bar');return{isActive:raw?.isActive??true,data:{...ANNOUNCEMENT_BAR_DEFAULTS,...(raw?.data??{})}}}
export async function updateAnnouncementBar(input:AnnouncementBarSection):Promise<void>{await adminApiFetch('/admin/content/storefront-sections/announcement-bar',{method:'PUT',body:{title:'Announcement Bar',...input}})}

// ─── Prebooking Modal ────────────────────────────────────────────────────────
export interface PrebookingModalData{
  // Trigger
  floatingButtonLabel:string
  delayMs:number
  capacity:number
  // Form copy
  badge:string
  headline:string
  description:string
  submitButtonLabel:string
  privacyNote:string
  // Donation section
  showDonation:boolean
  donationLabel:string
  donationSublabel:string
  donationQrUrl:string
  // Success screen
  successHeadline:string
  successDescription:string
  whatsappButtonLabel:string
  continueShoppingLabel:string
}
export interface PrebookingModalSection{isActive:boolean;data:PrebookingModalData}
const PREBOOKING_MODAL_DEFAULTS:PrebookingModalData={
  floatingButtonLabel:'Pre-book now',
  delayMs:900,
  capacity:500,
  badge:'Launching soon',
  headline:'BE FIRST IN LINE',
  description:'Join the FUYL pre-booking list for early access and launch updates.',
  submitButtonLabel:'Join pre-booking list',
  privacyNote:"We'll only use your details for FUYL pre-booking updates.",
  showDonation:true,
  donationLabel:'I would like to make an optional donation',
  donationSublabel:'You can still join the pre-booking list without donating.',
  donationQrUrl:'',
  successHeadline:"YOU'RE ON THE LIST!",
  successDescription:"We've emailed your confirmation. You'll be among the first to know when pre-booking opens.",
  whatsappButtonLabel:'Join our WhatsApp community',
  continueShoppingLabel:'Continue shopping',
}
export async function getPrebookingModal():Promise<PrebookingModalSection>{const raw=await adminApiFetch<({_id?:string}|null)&Partial<PrebookingModalSection>>('/admin/content/storefront-sections/prebooking-modal');return{isActive:raw?.isActive??true,data:{...PREBOOKING_MODAL_DEFAULTS,...(raw?.data??{})}}}
export async function updatePrebookingModal(input:PrebookingModalSection):Promise<void>{await adminApiFetch('/admin/content/storefront-sections/prebooking-modal',{method:'PUT',body:{title:'Prebooking Modal',...input}})}

// ─── Popup Banner ────────────────────────────────────────────────────────────
export interface PopupBannerData{title:string;body:string;imageUrl:string;ctaLabel:string;ctaHref:string;delayMs:number;frequency:'always'|'once_per_session'|'once_ever'}
export interface PopupBannerSection{isActive:boolean;data:PopupBannerData}
const POPUP_BANNER_DEFAULTS:PopupBannerData={title:'',body:'',imageUrl:'',ctaLabel:'',ctaHref:'',delayMs:2000,frequency:'once_per_session'}
export async function getPopupBanner():Promise<PopupBannerSection>{const raw=await adminApiFetch<({_id?:string}|null)&Partial<PopupBannerSection>>('/admin/content/storefront-sections/popup-banner');return{isActive:raw?.isActive??false,data:{...POPUP_BANNER_DEFAULTS,...(raw?.data??{})}}}
export async function updatePopupBanner(input:PopupBannerSection):Promise<void>{await adminApiFetch('/admin/content/storefront-sections/popup-banner',{method:'PUT',body:{title:'Popup Banner',...input}})}

// ─── CMS Pages ──────────────────────────────────────────────────────────────
interface BackendCMSPage {
  _id: string
  slug: string
  title: string
  body: string
  seoTitle?: string
  seoDescription?: string
  status: ContentStatus
  navigationPlacement?: 'none' | 'header' | 'footer' | 'both'
  navigationLabel?: string
  navigationOrder?: number
  updatedAt: string
}

export interface CMSPageSummary {
  id: string
  slug: string
  title: string
  status: ContentStatus
  navigationPlacement: 'none' | 'header' | 'footer' | 'both'
  navigationLabel: string
  navigationOrder: number
  updatedAt: string
}

export interface CMSPageDetail extends CMSPageSummary {
  body: string
  seoTitle: string
  seoDescription: string
}

export interface CMSPageRevision {
  revisionId: string
  title: string
  status: ContentStatus
  savedAt: string
}

export interface PageQualityAudit {
  summary: {
    score: number
    totalPages: number
    publishedPages: number
    affectedPages: number
    errorCount: number
    warningCount: number
  }
  issues: Array<{
    pageId: string
    title: string
    slug: string
    type: string
    severity: 'error' | 'warning'
    message: string
    editHref?: string
    storefrontPath?: string
  }>
  checkedAt: string
}

export interface CMSPageInput {
  title: string
  body: string
  seoTitle: string
  seoDescription: string
  status: ContentStatus
  navigationPlacement: 'none' | 'header' | 'footer' | 'both'
  navigationLabel: string
  navigationOrder: number
}

function mapPage(p: BackendCMSPage): CMSPageSummary {
  return { id: p._id, slug: p.slug, title: p.title, status: p.status, updatedAt: p.updatedAt, navigationPlacement: p.navigationPlacement ?? 'none', navigationLabel: p.navigationLabel ?? '', navigationOrder: p.navigationOrder ?? 0 }
}

export interface PageListOptions { page?: number; limit?: number; search?: string; status?: ContentStatus | 'all'; navigation?: CMSPageSummary['navigationPlacement'] | 'all'; sort?: 'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc' | 'navigation' }

export async function listAdminPages(options: PageListOptions = {}): Promise<{ items: CMSPageSummary[]; meta: PaginationMeta }> {
  const query = new URLSearchParams({ page: String(options.page ?? 1), limit: String(options.limit ?? 20) })
  if (options.search?.trim()) query.set('q', options.search.trim())
  if (options.status && options.status !== 'all') query.set('status', options.status)
  if (options.navigation && options.navigation !== 'all') query.set('navigation', options.navigation)
  if (options.sort) query.set('sort', options.sort)
  const result = await adminApiFetchPaginated<BackendCMSPage>(`/admin/content/pages?${query}`)
  return { items: result.items.map(mapPage), meta: result.meta }
}

export async function getAdminPage(id: string): Promise<CMSPageDetail | null> {
  try {
    const p = await adminApiFetch<BackendCMSPage>(`/admin/content/pages/${id}`)
    return { ...mapPage(p), body: p.body, seoTitle: p.seoTitle ?? '', seoDescription: p.seoDescription ?? '', navigationPlacement: p.navigationPlacement ?? 'none', navigationLabel: p.navigationLabel ?? '', navigationOrder: p.navigationOrder ?? 0 }
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) return null
    throw err
  }
}

export async function createPage(input: CMSPageInput): Promise<string> {
  const p = await adminApiFetch<{ _id: string }>('/admin/content/pages', { method: 'POST', body: input })
  return p._id
}

export async function updatePage(id: string, input: CMSPageInput): Promise<void> {
  await adminApiFetch(`/admin/content/pages/${id}`, { method: 'PATCH', body: input })
}

export async function deletePage(id: string): Promise<void> {
  await adminApiFetch(`/admin/content/pages/${id}`, { method: 'DELETE' })
}

export async function createPagePreviewToken(id: string): Promise<string> {
  const result = await adminApiFetch<{ token: string }>(`/admin/content/pages/${id}/preview-token`, { method: 'POST' })
  return result.token
}

export async function listPageRevisions(id: string): Promise<CMSPageRevision[]> {
  return adminApiFetch<CMSPageRevision[]>(`/admin/content/pages/${id}/revisions`)
}

export async function restorePageRevision(id: string, revisionId: string): Promise<void> {
  await adminApiFetch(`/admin/content/pages/${id}/revisions/${revisionId}/restore`, { method: 'POST' })
}

export async function getPageQualityAudit(): Promise<PageQualityAudit> {
  return adminApiFetch<PageQualityAudit>('/admin/content/pages-quality')
}

export async function updatePageNavigation(items: Array<Pick<CMSPageSummary, 'id' | 'navigationPlacement' | 'navigationLabel' | 'navigationOrder'>>): Promise<void> {
  await adminApiFetch('/admin/content/pages/navigation', { method: 'PUT', body: { items } })
}

// ─── Ingredients ────────────────────────────────────────────────────────────
// INGREDIENT_CATEGORIES/IngredientCategory live in lib/ingredientCategory.ts
// (a zero-dependency file) — re-exported here for server-side callers, but
// Client Components must import the real value from that file directly
// (see its own comment for why — same issue as lib/orderStatus.ts).
import type { IngredientCategory } from './ingredientCategory'
export type { IngredientCategory } from './ingredientCategory'
export { INGREDIENT_CATEGORIES } from './ingredientCategory'

interface BackendIngredient {
  _id: string
  slug: string
  name: string
  amount: string
  benefit: string
  description: string
  image?: string
  category: IngredientCategory
  clinicalBacking?: string
  isActive: boolean
  order:number
}

export interface IngredientRecord {
  id: string
  slug: string
  name: string
  amount: string
  benefit: string
  description: string
  image: string
  category: IngredientCategory
  clinicalBacking: string
  isActive: boolean
  order:number
}

export type IngredientInput = Omit<IngredientRecord, 'id' | 'slug' | 'order'> & { order?: number }

function mapIngredient(i: BackendIngredient): IngredientRecord {
  return {
    id: i._id, slug: i.slug, name: i.name, amount: i.amount, benefit: i.benefit,
    description: i.description, image: i.image ?? '', category: i.category,
    clinicalBacking: i.clinicalBacking ?? '', isActive: i.isActive, order:i.order??0,
  }
}

export async function listAdminIngredients(): Promise<IngredientRecord[]> {
  const raw = await adminApiFetch<BackendIngredient[]>('/admin/content/ingredients?limit=200')
  return raw.map(mapIngredient)
}

export async function getAdminIngredient(id: string): Promise<IngredientRecord | null> {
  try {
    return mapIngredient(await adminApiFetch<BackendIngredient>(`/admin/content/ingredients/${id}`))
  } catch {
    return null
  }
}

export async function createIngredient(input: IngredientInput): Promise<string> {
  const i = await adminApiFetch<{ _id: string }>('/admin/content/ingredients', { method: 'POST', body: input })
  return i._id
}

export async function updateIngredient(id: string, input: IngredientInput): Promise<void> {
  await adminApiFetch(`/admin/content/ingredients/${id}`, { method: 'PATCH', body: input })
}

export async function deleteIngredient(id: string): Promise<void> {
  await adminApiFetch(`/admin/content/ingredients/${id}`, { method: 'DELETE' })
}

// ─── Testimonials ───────────────────────────────────────────────────────────
interface BackendTestimonial {
  _id: string
  name: string
  title?: string
  type: 'expert' | 'customer'
  body: string
  rating?: number
  image?: string
  isActive: boolean
  order:number
}

export interface TestimonialRecord {
  id: string
  name: string
  title: string
  type: 'expert' | 'customer'
  body: string
  rating: number | undefined
  image: string
  isActive: boolean
  order:number
}

export type TestimonialInput = Omit<TestimonialRecord, 'id' | 'order'> & { order?: number }

function mapTestimonial(t: BackendTestimonial): TestimonialRecord {
  return {
    id: t._id, name: t.name, title: t.title ?? '', type: t.type, body: t.body,
    rating: t.rating, image: t.image ?? '', isActive: t.isActive, order:t.order??0,
  }
}

export async function listAdminTestimonials(): Promise<TestimonialRecord[]> {
  const raw = await adminApiFetch<BackendTestimonial[]>('/admin/content/testimonials?limit=200')
  return raw.map(mapTestimonial)
}

export async function getAdminTestimonial(id: string): Promise<TestimonialRecord | null> {
  try {
    return mapTestimonial(await adminApiFetch<BackendTestimonial>(`/admin/content/testimonials/${id}`))
  } catch {
    return null
  }
}

export async function createTestimonial(input: TestimonialInput): Promise<string> {
  const t = await adminApiFetch<{ _id: string }>('/admin/content/testimonials', { method: 'POST', body: input })
  return t._id
}

export async function updateTestimonial(id: string, input: TestimonialInput): Promise<void> {
  await adminApiFetch(`/admin/content/testimonials/${id}`, { method: 'PATCH', body: input })
}

export async function deleteTestimonial(id: string): Promise<void> {
  await adminApiFetch(`/admin/content/testimonials/${id}`, { method: 'DELETE' })
}

// ─── FAQs ───────────────────────────────────────────────────────────────────
interface BackendFAQ {
  _id: string
  question: string
  answer: string
  isActive: boolean
  order: number
}

export interface FAQRecord {
  id: string
  question: string
  answer: string
  isActive: boolean
  order: number
}

export type FAQInput = Omit<FAQRecord, 'id' | 'order'> & { order?: number }

function mapFAQ(f: BackendFAQ): FAQRecord {
  return { id: f._id, question: f.question, answer: f.answer, isActive: f.isActive, order: f.order ?? 0 }
}

export async function listAdminFAQs(): Promise<FAQRecord[]> {
  const raw = await adminApiFetch<BackendFAQ[]>('/admin/content/faqs?limit=200')
  return raw.map(mapFAQ)
}

export async function getAdminFAQ(id: string): Promise<FAQRecord | null> {
  try {
    return mapFAQ(await adminApiFetch<BackendFAQ>(`/admin/content/faqs/${id}`))
  } catch {
    return null
  }
}

export async function createFAQ(input: FAQInput): Promise<string> {
  const f = await adminApiFetch<{ _id: string }>('/admin/content/faqs', { method: 'POST', body: input })
  return f._id
}

export async function updateFAQ(id: string, input: FAQInput): Promise<void> {
  await adminApiFetch(`/admin/content/faqs/${id}`, { method: 'PATCH', body: input })
}

export async function deleteFAQ(id: string): Promise<void> {
  await adminApiFetch(`/admin/content/faqs/${id}`, { method: 'DELETE' })
}

// ─── Our Story ──────────────────────────────────────────────────────────────
export interface OurStoryFounder { image: string; name: string; bio: string }
export interface OurStoryMilestone { title: string; body: string }
export interface OurStoryData { heroQuote: string; founders: OurStoryFounder[]; milestones: OurStoryMilestone[]; ctaLabel: string; ctaHref: string }
export interface OurStorySection { isActive: boolean; data: OurStoryData }
const OUR_STORY_DEFAULTS: OurStoryData = {
  heroQuote: "We didn't set out to build a supplement brand. We set out to solve our own problem — and found that millions of Indians shared it.",
  founders: [
    { image: '/images/hero-slide-1.webp', name: 'SWEEKAR SAXENA', bio: 'I am a product of "<strong>Kota Factory</strong>", an engineer, an Executive MBA from IIM Lucknow, health conscious individual. Yet, for most of my adult life, I was quietly undernourished.' },
    { image: '/images/fuyl-complete+.webp', name: 'ANUPAM PANDEY', bio: 'The story of an average urban Indian is one long hustle. We don\'t inherit our place. We earn it, in a crowd, pushing because everyone around us is pushing.' },
  ],
  milestones: [
    { title: 'THE IDEA', body: 'Two founders. One shared frustration. The realisation that no single trustworthy daily nutrition product existed for the urban Indian who actually reads labels.' },
    { title: 'THE FORMULATION', body: 'Months of research. Multiple iterations. Dozens of ingredient decisions. Each one made against published clinical evidence, not marketing budgets.' },
    { title: 'THE TASTE PROBLEM', body: 'A formulation that works means nothing if people stop taking it. We tested, failed, retested. The deep berry crimson drink you hold today is the result of that process.' },
    { title: 'FIRST BATCH', body: 'Premium looking eco-friendly composite box. The 10g sachet. 15 sachets. ₹1,499. FUYL COMPLETE+ is ready.' },
    { title: 'THE LAUNCH', body: 'FUYL goes live. The beginning of building one trusted nutritional foundation for urban India.' },
  ],
  ctaLabel: 'Try FUYL Complete+ — ₹1,499 for 15 sachets',
  ctaHref: '/products/fuyl-complete',
}
export async function getOurStorySection(): Promise<OurStorySection> { const raw = await adminApiFetch<({_id?:string}|null)&Partial<OurStorySection>>('/admin/content/storefront-sections/page-our-story'); return { isActive: raw?.isActive ?? true, data: { ...OUR_STORY_DEFAULTS, ...(raw?.data ?? {}) } } }
export async function updateOurStorySection(input: OurStorySection): Promise<void> { await adminApiFetch('/admin/content/storefront-sections/page-our-story', { method: 'PUT', body: { title: 'Our Story Page', ...input } }) }

// ─── Why FUYL ────────────────────────────────────────────────────────────────
export interface WhyFuylData { heroHeadline: string; heroDescription: string; heroImage: string; ctaLabel: string; ctaHref: string; pillarsHeadline: string; pillarsSubheadline: string }
export interface WhyFuylSection { isActive: boolean; data: WhyFuylData }
const WHY_FUYL_DEFAULTS: WhyFuylData = {
  heroHeadline: 'WHY FUYL COMPLETE+ IS DIFFERENT',
  heroDescription: 'We built COMPLETE+ because the daily nutritional supplement industry has failed the health-conscious consumer through token doses, cheap ingredient forms, claims that do not hold up, and products too unpleasant to take consistently.',
  heroImage: '/images/We_are_different-hero.webp',
  ctaLabel: 'Taste Now',
  ctaHref: '/products/fuyl-complete',
  pillarsHeadline: 'PILLARS THAT MAKE FUYL',
  pillarsSubheadline: 'DISCOVER THE USPs THAT MAKE OUR PRODUCTS EXCEPTIONAL',
}
export async function getWhyFuylSection(): Promise<WhyFuylSection> { const raw = await adminApiFetch<({_id?:string}|null)&Partial<WhyFuylSection>>('/admin/content/storefront-sections/page-why-fuyl'); return { isActive: raw?.isActive ?? true, data: { ...WHY_FUYL_DEFAULTS, ...(raw?.data ?? {}) } } }
export async function updateWhyFuylSection(input: WhyFuylSection): Promise<void> { await adminApiFetch('/admin/content/storefront-sections/page-why-fuyl', { method: 'PUT', body: { title: 'Why FUYL Page', ...input } }) }

// ─── Legal pages (shared shape) ──────────────────────────────────────────────
export interface LegalSection { heading: string; body: string; isList: boolean }
export interface LegalPageData { lastUpdated: string; subtitle: string; sections: LegalSection[] }
export interface LegalPageSection { isActive: boolean; data: LegalPageData }

async function getLegalSection(key: string, defaults: LegalPageData): Promise<LegalPageSection> {
  const raw = await adminApiFetch<({_id?:string}|null)&Partial<LegalPageSection>>(`/admin/content/storefront-sections/${key}`)
  return { isActive: raw?.isActive ?? true, data: { ...defaults, ...(raw?.data ?? {}) } }
}
async function updateLegalSection(key: string, title: string, input: LegalPageSection): Promise<void> {
  await adminApiFetch(`/admin/content/storefront-sections/${key}`, { method: 'PUT', body: { title, ...input } })
}

// Privacy Policy
const PRIVACY_DEFAULTS: LegalPageData = {
  lastUpdated: 'January 2025',
  subtitle: 'How we collect, use and protect your personal information.',
  sections: [
    { heading: 'Information We Collect', body: 'Name, email address, phone number and delivery address when you place an order\nPayment information — processed securely by Razorpay, never stored by us\nUsage data such as pages visited, time on site and device type via anonymised analytics\nCommunications you send us via email, WhatsApp or our contact form', isList: true },
    { heading: 'How We Use Your Information', body: 'To process and fulfil your orders and send shipping notifications\nTo respond to your queries and provide customer support\nTo send you product updates, offers and educational content (only if you opt in)\nTo improve our website, product and service through anonymised analytics', isList: true },
    { heading: 'Data Sharing', body: 'We share your data only with partners required to fulfil your order — logistics providers (name and address) and payment processors (Razorpay). We do not sell, rent or trade your personal information to any third parties for marketing purposes.', isList: false },
    { heading: 'Cookies', body: 'We use essential cookies to keep you logged in and remember your cart. We use analytics cookies (anonymised) to understand how visitors use our site. You can disable non-essential cookies in your browser settings.', isList: false },
    { heading: 'Data Security', body: 'All data is transmitted over HTTPS. Payment data is processed by Razorpay (PCI-DSS compliant). We store only what is necessary and review our data practices regularly.', isList: false },
    { heading: 'Your Rights', body: 'Request access to the personal data we hold about you\nRequest correction of inaccurate data\nRequest deletion of your data (subject to legal obligations)\nOpt out of marketing communications at any time\nLodge a complaint with the relevant data protection authority', isList: true },
    { heading: 'Contact', body: 'For any privacy-related queries, email us at support@fuyl.in. We aim to respond within 5 business days.', isList: false },
  ],
}
export async function getPrivacyPolicySection(): Promise<LegalPageSection> { return getLegalSection('page-privacy-policy', PRIVACY_DEFAULTS) }
export async function updatePrivacyPolicySection(input: LegalPageSection): Promise<void> { return updateLegalSection('page-privacy-policy', 'Privacy Policy', input) }

// Shipping Policy
const SHIPPING_DEFAULTS: LegalPageData = {
  lastUpdated: 'January 2025',
  subtitle: 'Everything you need to know about how and when we ship your order.',
  sections: [
    { heading: 'Processing Time', body: 'All orders are processed within 1–2 business days (Monday to Saturday, excluding public holidays) after receiving your order confirmation email. You will receive a notification when your order has shipped.', isList: false },
    { heading: 'Shipping Rates & Delivery Times', body: 'Free standard shipping on all orders above ₹499 — delivered within 5–7 business days\nStandard shipping ₹79 for orders below ₹499 — delivered within 5–7 business days\nExpress shipping ₹149 — delivered within 2–3 business days (select cities)', isList: true },
    { heading: 'Delivery Areas', body: 'We ship to all pin codes across India via Shiprocket and its network of courier partners. For remote areas, delivery may take up to 10 business days. Please ensure your delivery address is correct and complete at the time of ordering.', isList: false },
    { heading: 'Order Tracking', body: 'Once your order is shipped, you will receive a tracking link via email and SMS. You can also track your order in your account under "Orders".', isList: false },
    { heading: 'Failed Delivery', body: 'If a delivery attempt fails, the courier will make up to 3 attempts. If all attempts fail, the package will be returned to us and we will contact you to rearrange delivery or issue a refund.', isList: false },
    { heading: 'Damaged in Transit', body: 'If your order arrives damaged, please photograph the packaging and product immediately and email support@fuyl.in within 48 hours of delivery. We will arrange a replacement or refund promptly.', isList: false },
  ],
}
export async function getShippingPolicySection(): Promise<LegalPageSection> { return getLegalSection('page-shipping-policy', SHIPPING_DEFAULTS) }
export async function updateShippingPolicySection(input: LegalPageSection): Promise<void> { return updateLegalSection('page-shipping-policy', 'Shipping Policy', input) }

// Cancellation & Returns
const CANCELLATION_DEFAULTS: LegalPageData = {
  lastUpdated: 'January 2025',
  subtitle: 'Our 30-day money-back guarantee and returns process — explained clearly.',
  sections: [
    { heading: '30-Day Money-Back Guarantee', body: 'We stand behind FUYL COMPLETE+ with a 30-day money-back guarantee. If you have taken the product consistently for 30 days and do not feel a meaningful improvement in your energy, gut health or overall wellbeing, contact us for a full refund. No questions asked.', isList: false },
    { heading: 'Order Cancellation', body: 'Orders can be cancelled within 2 hours of placement for a full refund\nOrders already dispatched cannot be cancelled — initiate a return on delivery instead\nTo cancel, email support@fuyl.in immediately with your order number', isList: true },
    { heading: 'Return Eligibility', body: 'Products returned within 30 days of delivery are eligible for a full refund\nDamaged or defective products are eligible for replacement or refund regardless of timeline\nOpened products are eligible under our 30-day guarantee (see above)', isList: true },
    { heading: 'How to Initiate a Return', body: 'Email support@fuyl.in with your order number and reason for return\nWe will provide a return shipping label within 24 hours\nOnce the return is received and inspected, refunds are processed within 5–7 business days', isList: true },
    { heading: 'Refund Method', body: 'Refunds are issued to the original payment method. UPI and wallet refunds typically process within 24 hours. Card refunds may take 5–10 business days depending on your bank.', isList: false },
  ],
}
export async function getCancellationReturnsSection(): Promise<LegalPageSection> { return getLegalSection('page-cancellation-returns', CANCELLATION_DEFAULTS) }
export async function updateCancellationReturnsSection(input: LegalPageSection): Promise<void> { return updateLegalSection('page-cancellation-returns', 'Cancellation & Returns', input) }

// Terms & Conditions
const TERMS_DEFAULTS: LegalPageData = {
  lastUpdated: 'January 2025',
  subtitle: 'The terms governing your use of fuyl.in and purchase of FUYL products.',
  sections: [
    { heading: 'Acceptance of Terms', body: 'By accessing fuyl.in or placing an order, you agree to these Terms and Conditions. If you do not agree, please do not use our website or purchase our products. We reserve the right to update these terms at any time — continued use of the site constitutes acceptance.', isList: false },
    { heading: 'Products & Descriptions', body: 'We make every effort to ensure product descriptions, ingredient lists and images are accurate. However, we do not warrant that descriptions are error-free. FUYL COMPLETE+ is a food supplement, not a medicine, and is not intended to diagnose, treat, cure or prevent any disease.', isList: false },
    { heading: 'Pricing & Payment', body: 'All prices are in Indian Rupees (₹) and inclusive of GST\nPrices are subject to change without notice — orders are billed at the price at time of purchase\nPayment is accepted via UPI, credit/debit card, net banking and wallets through Razorpay\nFailed payments will not result in order confirmation', isList: true },
    { heading: 'Intellectual Property', body: 'All content on fuyl.in — including text, images, logos, and product formulations — is the property of FUYL (Healthful Wellness Pvt Ltd) or its licensors. You may not reproduce, distribute or create derivative works without written permission.', isList: false },
    { heading: 'Limitation of Liability', body: 'To the maximum extent permitted by law, FUYL is not liable for any indirect, incidental or consequential damages arising from use of our products or website. Our total liability shall not exceed the value of the order in question.', isList: false },
    { heading: 'Governing Law', body: 'These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts of [City], India.', isList: false },
  ],
}
export async function getTermsConditionsSection(): Promise<LegalPageSection> { return getLegalSection('page-terms-conditions', TERMS_DEFAULTS) }
export async function updateTermsConditionsSection(input: LegalPageSection): Promise<void> { return updateLegalSection('page-terms-conditions', 'Terms & Conditions', input) }

export { AdminApiError }
