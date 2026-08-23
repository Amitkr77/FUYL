'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Trash2, CheckCircle2, ImagePlus, AlertCircle, Star, X, Plus, Truck } from 'lucide-react'
import type {
  AdminProduct, AttributeDef, ProductStatus, AdminVariant,
  AdditionalPrice, FAQEntry, CertificationEntry, ProductInfoBlock, ShippingInfo, WeightUnit, SeoInfo,
} from '@/lib/products'
import type { AdminTag } from '@/lib/tags'
import { createProductAction, updateProductAction, archiveProductAction, getProductImageUploadSignature } from '@/app/(admin)/products/actions'
import { uploadImage } from '@/lib/upload'
import { Collapsible } from '@/components/ui/Collapsible'
import { Toggle } from '@/components/ui/Toggle'

interface Props {
  product?: AdminProduct
  attributes: AttributeDef[]
  tags: AdminTag[]
  isNew?: boolean
}

const inputCls =
  'w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent'
const smallInputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent'
const labelCls = 'block text-sm font-medium text-slate-700 mb-1.5'
const helpCls = 'text-xs text-slate-400 mt-1.5'
const cardCls = 'bg-white border border-slate-200 rounded-xl shadow-sm p-6'

const PACKAGE_SUGGESTIONS = ['Custom Package', 'Poly Mailer', 'Padded Mailer', 'Box', 'Envelope']
const WEIGHT_UNITS: { value: WeightUnit; label: string }[] = [
  { value: 'g', label: 'g' },
  { value: 'kg', label: 'kg' },
  { value: 'lb', label: 'lb' },
  { value: 'oz', label: 'oz' },
]

function emptyVariant(defaultPrice: number): AdminVariant {
  return { id: '', sku: '', name: '', attributes: {}, price: defaultPrice, compareAtPrice: undefined, stock: 0, images: [], weight: undefined }
}

// Duplicated (not imported) from lib/products.ts — that module also pulls in
// getSession()/next/headers for its server-side calls, which can't be
// bundled into this client component. Kept in sync manually; it's a single
// pure one-liner.
function slugify(name: string): string {
  const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return base || 'product'
}

export function ProductForm({ product, attributes, tags, isNew = false }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name:        product?.name ?? '',
    brand:       product?.brand ?? '',
    tags:        product?.tags ?? [],
    shortDescription: product?.shortDescription ?? '',
    description: product?.description ?? '',
    status:      product?.status ?? ('draft' as ProductStatus),
    isPublished:    product?.isPublished ?? false,
    isSubscribable: product?.isSubscribable ?? false,
    images:      product?.images ?? [],
    price:            product?.price ?? 1499,
    compareAtPrice:   product?.compareAtPrice,
    // Only used/shown when there are no variants — stock is tracked
    // per-variant instead once you add one.
    stock:            product?.stock ?? 0,
    additionalPrices: product?.additionalPrices ?? [],
    unitPriceValue:   product?.unitPriceValue,
    unitPriceUnit:    product?.unitPriceUnit ?? '',
    isTaxable:        product?.isTaxable ?? true,
    taxRate:          product?.taxRate,
    costPerItem:      product?.costPerItem,
    ingredients:      product?.ingredients ?? [],
    benefits:         product?.benefits ?? [],
    faqs:             product?.faqs ?? [],
    certifications:   product?.certifications ?? [],
    supplementInfo:   product?.supplementInfo ?? {},
    infoBlocks:       product?.infoBlocks ?? [],
    shipping:         product?.shipping ?? ({ isPhysical: true, weightUnit: 'g', shippingMode: 'calculated' } as ShippingInfo),
    seo:              product?.seo ?? ({ slug: '' } as SeoInfo),
  })
  const set = (k: Partial<typeof form>) => setForm((f) => ({ ...f, ...k }))
  const setShipping = (k: Partial<ShippingInfo>) => set({ shipping: { ...form.shipping, ...k } })
  const setSeo = (k: Partial<SeoInfo>) => set({ seo: { ...form.seo, ...k } })

  // On a brand-new product, auto-suggest the slug from the name until the
  // admin edits the Slug field directly — once they do, stop overwriting it.
  // Existing products never auto-sync (editing the title shouldn't silently
  // change a live product's URL).
  const [slugTouched, setSlugTouched] = useState(!isNew)
  const handleNameChange = (name: string) => {
    if (isNew && !slugTouched) {
      set({ name, seo: { ...form.seo, slug: slugify(name) } })
    } else {
      set({ name })
    }
  }

  // Variants are optional — a product with none is sold using the price set
  // in the Pricing card above, so the initial list is whatever the product
  // already has (possibly empty), never force-seeded.
  const [variants, setVariants] = useState<AdminVariant[]>(product?.variants ?? [])
  const updateVariant = (i: number, patch: Partial<AdminVariant>) =>
    setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, ...patch } : v)))
  const addVariant = () => setVariants((vs) => [...vs, emptyVariant(form.price)])
  const removeVariant = (i: number) => setVariants((vs) => vs.filter((_, idx) => idx !== i))

  const profit = form.costPerItem != null ? form.price - form.costPerItem : null
  const margin = profit != null && form.price > 0 ? (profit / form.price) * 100 : null

  // ─── Tags ────────────────────────────────────────────────────────
  // Free-typed names, chip-style (mirrors EditBlogPostForm.tsx) — resolved to
  // Tag document ids (creating new ones as needed) on save, see lib/tags.ts.
  const [tagInput, setTagInput] = useState('')
  const addTag = () => {
    const value = tagInput.trim()
    if (!value || form.tags.includes(value)) { setTagInput(''); return }
    set({ tags: [...form.tags, value] })
    setTagInput('')
  }
  const removeTag = (tag: string) => set({ tags: form.tags.filter((t) => t !== tag) })

  // ─── Product image gallery ──────────────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setError('')
    setIsUploading(true)
    for (const file of files) {
      const result = await uploadImage(file, getProductImageUploadSignature)
      if ('error' in result) { setError(result.error); continue }
      setForm((f) => ({ ...f, images: [...f.images, result.url] }))
    }
    setIsUploading(false)
  }
  const removeImage = (index: number) =>
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index) }))
  const makeCover = (index: number) =>
    setForm((f) => {
      const images = [...f.images]
      const [chosen] = images.splice(index, 1)
      images.unshift(chosen)
      return { ...f, images }
    })

  // ─── Per-variant image gallery ──────────────────────────────────
  const handleVariantFileChange = async (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setError('')
    setIsUploading(true)
    for (const file of files) {
      const result = await uploadImage(file, getProductImageUploadSignature)
      if ('error' in result) { setError(result.error); continue }
      setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, images: [...v.images, result.url] } : v)))
    }
    setIsUploading(false)
  }
  const removeVariantImage = (i: number, imgIdx: number) =>
    setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, images: v.images.filter((_, j) => j !== imgIdx) } : v)))

  // ─── Variant attributes (Size/Flavor/etc) ───────────────────────
  const addVariantAttribute = (i: number, key: string) => {
    if (!key.trim()) return
    setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, attributes: { ...v.attributes, [key.trim()]: '' } } : v)))
  }
  const setVariantAttributeValue = (i: number, key: string, value: string) =>
    setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, attributes: { ...v.attributes, [key]: value } } : v)))
  const removeVariantAttribute = (i: number, key: string) =>
    setVariants((vs) => vs.map((v, idx) => {
      if (idx !== i) return v
      const attributes = { ...v.attributes }
      delete attributes[key]
      return { ...v, attributes }
    }))

  // ─── Additional display prices ──────────────────────────────────
  const addPrice = () => set({ additionalPrices: [...form.additionalPrices, { label: '', price: 0 }] })
  const updatePrice = (i: number, patch: Partial<AdditionalPrice>) =>
    set({ additionalPrices: form.additionalPrices.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) })
  const removePrice = (i: number) => set({ additionalPrices: form.additionalPrices.filter((_, idx) => idx !== i) })

  // ─── Ingredients ─────────────────────────────────────────────────
  const addIngredient = () => set({ ingredients: [...form.ingredients, ''] })
  const updateIngredient = (i: number, value: string) => set({ ingredients: form.ingredients.map((v, idx) => (idx === i ? value : v)) })
  const removeIngredient = (i: number) => set({ ingredients: form.ingredients.filter((_, idx) => idx !== i) })

  // ─── Benefits ────────────────────────────────────────────────────
  const addBenefit = () => set({ benefits: [...form.benefits, ''] })
  const updateBenefit = (i: number, value: string) => set({ benefits: form.benefits.map((b, idx) => (idx === i ? value : b)) })
  const removeBenefit = (i: number) => set({ benefits: form.benefits.filter((_, idx) => idx !== i) })

  // ─── FAQs ────────────────────────────────────────────────────────
  const addFaq = () => set({ faqs: [...form.faqs, { question: '', answer: '' }] })
  const updateFaq = (i: number, patch: Partial<FAQEntry>) =>
    set({ faqs: form.faqs.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) })
  const removeFaq = (i: number) => set({ faqs: form.faqs.filter((_, idx) => idx !== i) })

  // ─── Certifications ──────────────────────────────────────────────
  const addCertification = () => set({ certifications: [...form.certifications, { label: '', logoUrl: '' }] })
  const updateCertification = (i: number, patch: Partial<CertificationEntry>) =>
    set({ certifications: form.certifications.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) })
  const removeCertification = (i: number) => set({ certifications: form.certifications.filter((_, idx) => idx !== i) })
  const uploadCertLogo = async (i: number, file: File) => {
    setError('')
    const result = await uploadImage(file, getProductImageUploadSignature)
    if ('error' in result) { setError(result.error); return }
    updateCertification(i, { logoUrl: result.url })
  }

  // ─── Product Information blocks (image + optional title + description) ──
  const addInfoBlock = () => set({ infoBlocks: [...form.infoBlocks, { image: undefined, title: '', description: '' }] })
  const updateInfoBlock = (i: number, patch: Partial<ProductInfoBlock>) =>
    set({ infoBlocks: form.infoBlocks.map((b, idx) => (idx === i ? { ...b, ...patch } : b)) })
  const removeInfoBlock = (i: number) => set({ infoBlocks: form.infoBlocks.filter((_, idx) => idx !== i) })
  const uploadInfoBlockImage = async (i: number, file: File) => {
    setError('')
    const result = await uploadImage(file, getProductImageUploadSignature)
    if ('error' in result) { setError(result.error); return }
    updateInfoBlock(i, { image: result.url })
  }

  const handleSave = () => {
    setError('')
    if (!form.name.trim()) {
      setError('Product name is required.')
      return
    }
    if (!form.price || form.price <= 0) {
      setError('A valid price greater than 0 is required.')
      return
    }
    if (form.images.length === 0) {
      setError('At least one product image is required.')
      return
    }
    if (variants.some((v) => !v.sku.trim())) {
      setError('Every variant needs a SKU.')
      return
    }
    if (variants.some((v) => !v.name.trim())) {
      setError('Every variant needs a name.')
      return
    }
    if (variants.some((v) => !Number.isFinite(v.price) || v.price <= 0)) {
      setError('Every variant needs a price greater than 0.')
      return
    }
    if (variants.some((v) => !Number.isInteger(v.stock) || v.stock < 0)) {
      setError('Variant stock must be a whole number of 0 or more.')
      return
    }
    if (variants.some((v) => v.compareAtPrice !== undefined && v.compareAtPrice <= v.price)) {
      setError('Each compare-at price must be greater than its selling price.')
      return
    }
    if (form.compareAtPrice !== undefined && form.compareAtPrice <= form.price) {
      setError('Compare-at price must be greater than the selling price.')
      return
    }
    const normalizedSkus = variants.map((v) => v.sku.trim().toUpperCase())
    if (new Set(normalizedSkus).size !== normalizedSkus.length) {
      setError('Variant SKUs must be unique.')
      return
    }
    const combinations = variants.map((v) => JSON.stringify(Object.entries(v.attributes).sort(([a], [b]) => a.localeCompare(b))))
    if (variants.length > 1 && new Set(combinations).size !== combinations.length) {
      setError('Each variant needs a unique combination of attributes.')
      return
    }
    if (form.additionalPrices.some((price) => !price.label.trim() || price.price < 0)) {
      setError('Every additional price needs a label and a valid amount.')
      return
    }
    if (form.status === 'active' && form.shipping.isPhysical && (!form.shipping.weight || form.shipping.weight <= 0) && variants.every((v) => !v.weight || v.weight <= 0)) {
      setError('An active physical product needs a product or variant shipping weight.')
      return
    }
    if (form.infoBlocks.some((b) => !b.description.trim())) {
      setError('Each product information block needs a description.')
      return
    }
    const input = { ...form, variants }
    startTransition(async () => {
      const result = isNew
        ? await createProductAction(input)
        : await updateProductAction(product!.id, input)
      // A successful action redirects server-side and never returns here —
      // reaching this point means it returned an error instead.
      if (result?.error) {
        setError(result.error)
        return
      }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const handleDelete = () => {
    if (!product) return
    setError('')
    startTransition(async () => {
      const result = await archiveProductAction(product.id)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{isNew ? 'New Product' : 'Edit Product'}</h2>
            <p className="text-sm text-slate-500">{isNew ? 'Create a new product listing' : `Editing: ${product?.name}`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button type="button" onClick={handleDelete} disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 border border-red-200 bg-white text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
              <Trash2 className="w-4 h-4" /> Archive
            </button>
          )}
          <button type="button" onClick={handleSave} disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : isPending ? 'Saving…' : isNew ? 'Create Product' : 'Save Changes'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Main — 2/3 */}
        <div className="lg:col-span-2 space-y-5">
          {/* Basic info */}
          <div className={`${cardCls} space-y-4`}>
            <h3 className="text-sm font-semibold text-slate-900">Product Information</h3>
            <div>
              <label className={labelCls}>Product Name</label>
              <input type="text" value={form.name} onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. FUYL COMPLETE+" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Brand</label>
              <input type="text" value={form.brand} onChange={(e) => set({ brand: e.target.value })}
                placeholder="e.g. FUYL" className={inputCls} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelCls + ' mb-0'}>Short Description</label>
                <span className="text-xs text-slate-400">{form.shortDescription.length}/280</span>
              </div>
              <textarea value={form.shortDescription} onChange={(e) => set({ shortDescription: e.target.value.slice(0, 280) })} rows={2}
                placeholder="A short summary shown on product cards, listings, and previews..." maxLength={280} className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={4}
                placeholder="Describe the product in full..." className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className={labelCls}>Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {form.tags.map((tag) => (
                  <span key={tag} className="flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-[#558476]/10 text-[#558476] text-xs font-medium">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="p-0.5 hover:text-red-500"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  list="tag-suggestions"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
                  }}
                  placeholder="e.g. vegetarian, free-shipping"
                  className={smallInputCls}
                />
                <datalist id="tag-suggestions">
                  {tags.map((t) => <option key={t.id} value={t.name} />)}
                </datalist>
                <button type="button" onClick={addTag} className="flex items-center gap-1 text-xs font-medium text-[#558476] hover:underline whitespace-nowrap">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
              <p className={helpCls}>
                Press Enter to add. <span className="font-medium">vegetarian</span>, <span className="font-medium">free-shipping</span>, <span className="font-medium">made-in-india</span>, and <span className="font-medium">no-artificial-colour</span> show as badges on the product page.
              </p>
            </div>
          </div>

          {/* Product images */}
          <div className={cardCls}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900">Product Images</h3>
              {form.images.length > 0 && <span className="text-xs text-slate-400">{form.images.length} image{form.images.length === 1 ? '' : 's'}</span>}
            </div>
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={handleFileChange} />
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {form.images.map((url, i) => (
                <div key={`${url}-${i}`} className="relative group aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className={`w-full h-full rounded-lg object-cover border ${i === 0 ? 'border-[#558476]' : 'border-slate-200'}`} />
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#558476] text-white text-[10px] font-medium">
                      <Star className="w-2.5 h-2.5 fill-current" /> Cover
                    </span>
                  )}
                  <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    {i !== 0 && (
                      <button type="button" onClick={() => makeCover(i)} title="Make cover image" className="p-1.5 rounded-full bg-white text-slate-700 hover:text-[#558476]">
                        <Star className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button type="button" onClick={() => removeImage(i)} title="Remove" className="p-1.5 rounded-full bg-white text-slate-700 hover:text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploading}
                className="aspect-square border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center gap-1.5 text-center hover:border-[#558476]/40 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait">
                <ImagePlus className="w-6 h-6 text-slate-300" />
                <span className="text-xs text-slate-500 font-medium px-2">{isUploading ? 'Uploading…' : 'Add images'}</span>
              </button>
            </div>
            <p className={helpCls}>PNG, JPG, WEBP · first image is the cover shown in listings</p>
          </div>

          {/* Pricing */}
          <div className={`${cardCls} space-y-4`}>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Pricing</h3>
              <p className={helpCls + ' mt-0.5'}>
                Used as the product&apos;s base price. If you add variants below, each variant can set its own price and stock instead.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Price (₹)</label>
                <input type="number" value={form.price} onChange={(e) => set({ price: Number(e.target.value) })} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Compare-at Price (₹)</label>
                <input type="number" value={form.compareAtPrice ?? ''} onChange={(e) => set({ compareAtPrice: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="Optional" className={inputCls} />
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <Collapsible
                title="More pricing options"
                description="Stock, display prices, unit pricing, cost, tax, profit, and margin"
                defaultOpen={Boolean(
                  product && (
                    form.stock > 0
                    || form.additionalPrices.length > 0
                    || form.unitPriceValue != null
                    || form.unitPriceUnit
                    || form.costPerItem != null
                    || !form.isTaxable
                  )
                )}
              >
                <div className="space-y-4 pt-4">
            {variants.length === 0 && (
              <div>
                <label className={labelCls}>Stock</label>
                <input type="number" min={0} value={form.stock} onChange={(e) => set({ stock: Number(e.target.value) })} className={inputCls} />
                <p className={helpCls}>How many units you have on hand. Once you add a variant below, stock is tracked per variant instead.</p>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelCls + ' mb-0'}>Additional Display Prices</label>
                <button type="button" onClick={addPrice} className="flex items-center gap-1 text-xs font-medium text-[#558476] hover:underline">
                  <Plus className="w-3.5 h-3.5" /> Add price
                </button>
              </div>
              {form.additionalPrices.length === 0 ? (
                <p className="text-xs text-slate-400">e.g. &quot;MRP&quot;, &quot;Subscriber Price&quot;</p>
              ) : (
                <div className="space-y-2">
                  {form.additionalPrices.map((p, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input type="text" value={p.label} onChange={(e) => updatePrice(i, { label: e.target.value })} placeholder="Label" className={smallInputCls} />
                      <input type="number" value={p.price} onChange={(e) => updatePrice(i, { price: Number(e.target.value) })} placeholder="Price" className={`${smallInputCls} w-32`} />
                      <button type="button" onClick={() => removePrice(i)} className="p-2 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Unit Price Value</label>
                <input type="number" value={form.unitPriceValue ?? ''} onChange={(e) => set({ unitPriceValue: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="e.g. 99.93" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Unit Price Label</label>
                <input type="text" value={form.unitPriceUnit} onChange={(e) => set({ unitPriceUnit: e.target.value })}
                  placeholder="e.g. per sachet" className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Cost per Item (₹)</label>
              <input type="number" value={form.costPerItem ?? ''} onChange={(e) => set({ costPerItem: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Admin only" className={inputCls} />
            </div>

            <div className="rounded-lg border border-slate-200 px-4 py-3 space-y-3">
              <Toggle
                checked={form.isTaxable}
                onChange={(v) => set({ isTaxable: v, taxRate: v ? form.taxRate : undefined })}
                label="Charge tax on this product"
                description="When on, tax is added at checkout. When off, price is shown as inclusive of all taxes."
              />
              {form.isTaxable && (
                <div className="flex items-center gap-3 pl-1">
                  <div className="flex-1">
                    <label className={labelCls}>GST Rate (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={form.taxRate ?? ''}
                        onChange={(e) => set({ taxRate: e.target.value ? Number(e.target.value) : undefined })}
                        placeholder="e.g. 18"
                        className={inputCls}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium pointer-events-none">%</span>
                    </div>
                    <p className={helpCls}>Applied when no global tax rules match. Leave blank to use global tax rules only.</p>
                  </div>
                  {form.taxRate != null && form.taxRate > 0 && (
                    <div className="text-right text-xs text-slate-500 whitespace-nowrap">
                      <span className="block text-slate-400">Tax on ₹{form.price}</span>
                      <span className="font-semibold text-slate-700">+₹{((form.price * form.taxRate) / 100).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {profit != null && (
              <div className="flex items-center gap-6 pt-3 border-t border-slate-100">
                <div>
                  <p className="text-xs text-slate-400">Profit</p>
                  <p className="text-sm font-semibold text-slate-900">₹{profit.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Margin</p>
                  <p className="text-sm font-semibold text-slate-900">{margin!.toFixed(1)}%</p>
                </div>
              </div>
            )}
                </div>
              </Collapsible>
            </div>
          </div>

          {/* Variants — optional */}
          <div className={`${cardCls} space-y-4`}>
            <Collapsible
              title="Variants"
              description="Optional — e.g. Size, Flavor, Pack Size, Color. Leave empty to sell this as a single item at the price above."
              defaultOpen={variants.length > 0}
              headerRight={
                <button type="button" onClick={addVariant} className="flex items-center gap-1 text-xs font-medium text-[#558476] hover:underline whitespace-nowrap">
                  <Plus className="w-3.5 h-3.5" /> Add variant
                </button>
              }
            >
              {variants.length === 0 ? (
                <p className="text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg py-6 text-center">
                  No variants — this product will be sold as a single item using the price above.
                </p>
              ) : (
                <div className="space-y-4">
                  {variants.map((v, i) => (
                    <VariantRow
                      key={v.id || `new-${i}`}
                      variant={v}
                      index={i}
                      attributes={attributes}
                      isUploading={isUploading}
                      onUpdate={(patch) => updateVariant(i, patch)}
                      onRemove={() => removeVariant(i)}
                      onFileChange={(e) => handleVariantFileChange(i, e)}
                      onRemoveImage={(imgIdx) => removeVariantImage(i, imgIdx)}
                      onAddAttribute={(key) => addVariantAttribute(i, key)}
                      onSetAttributeValue={(key, value) => setVariantAttributeValue(i, key, value)}
                      onRemoveAttribute={(key) => removeVariantAttribute(i, key)}
                    />
                  ))}
                </div>
              )}
            </Collapsible>
          </div>

          {/* Metafields */}
          <div className={`${cardCls} space-y-5`}>
            <Collapsible title="Product Details" description="Ingredients, benefits, FAQs, certifications, and other informational content." defaultOpen>
              <div className="space-y-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls + ' mb-0'}>Ingredients</label>
                    <button type="button" onClick={addIngredient} className="flex items-center gap-1 text-xs font-medium text-[#558476] hover:underline">
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                  {form.ingredients.length === 0 && (
                    <p className="text-xs text-slate-400 mb-2">Shown in the Ingredients tab on the product page.</p>
                  )}
                  <div className="space-y-2">
                    {form.ingredients.map((ing, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="text" value={ing} onChange={(e) => updateIngredient(i, e.target.value)} placeholder="e.g. Ashwagandha (KSM-66)" className={smallInputCls} />
                        <button type="button" onClick={() => removeIngredient(i)} className="p-2 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls + ' mb-0'}>Benefits</label>
                    <button type="button" onClick={addBenefit} className="flex items-center gap-1 text-xs font-medium text-[#558476] hover:underline">
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.benefits.map((b, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="text" value={b} onChange={(e) => updateBenefit(i, e.target.value)} placeholder="e.g. Improves digestion" className={smallInputCls} />
                        <button type="button" onClick={() => removeBenefit(i)} className="p-2 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls + ' mb-0'}>FAQs</label>
                    <button type="button" onClick={addFaq} className="flex items-center gap-1 text-xs font-medium text-[#558476] hover:underline">
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                  <div className="space-y-3">
                    {form.faqs.map((f, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                          <input type="text" value={f.question} onChange={(e) => updateFaq(i, { question: e.target.value })} placeholder="Question" className={smallInputCls} />
                          <textarea value={f.answer} onChange={(e) => updateFaq(i, { answer: e.target.value })} placeholder="Answer" rows={2} className={`${smallInputCls} resize-none`} />
                        </div>
                        <button type="button" onClick={() => removeFaq(i)} className="p-2 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls + ' mb-0'}>Certifications</label>
                    <button type="button" onClick={addCertification} className="flex items-center gap-1 text-xs font-medium text-[#558476] hover:underline">
                      <Plus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {form.certifications.map((c, i) => (
                      <div key={i} className="flex items-center gap-2">
                        {c.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.logoUrl} alt="" className="w-9 h-9 rounded object-contain border border-slate-200 bg-white flex-shrink-0" />
                        ) : (
                          <label className="w-9 h-9 rounded border border-dashed border-slate-300 flex items-center justify-center flex-shrink-0 cursor-pointer hover:border-[#558476]/50">
                            <ImagePlus className="w-4 h-4 text-slate-300" />
                            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                              onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) uploadCertLogo(i, file) }} />
                          </label>
                        )}
                        <input type="text" value={c.label} onChange={(e) => updateCertification(i, { label: e.target.value })} placeholder="e.g. FSSAI" className={smallInputCls} />
                        <button type="button" onClick={() => removeCertification(i)} className="p-2 text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Product Information — repeatable image + optional title + description blocks */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <label className={labelCls + ' mb-0'}>Product Information</label>
                    <button type="button" onClick={addInfoBlock} className="flex items-center gap-1 text-xs font-medium text-[#558476] hover:underline">
                      <Plus className="w-3.5 h-3.5" /> Add block
                    </button>
                  </div>
                  <p className={helpCls + ' mb-2.5'}>Rich informational content blocks — an image, an optional title, and a description.</p>
                  <div className="space-y-3">
                    {form.infoBlocks.map((b, i) => (
                      <div key={i} className="flex items-start gap-3 border border-slate-200 rounded-lg p-3">
                        {b.image ? (
                          <div className="relative w-16 h-16 flex-shrink-0">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={b.image} alt="" className="w-full h-full rounded-lg object-cover border border-slate-200" />
                            <button type="button" onClick={() => updateInfoBlock(i, { image: undefined })}
                              className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-red-500">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="w-16 h-16 flex-shrink-0 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#558476]/40">
                            <ImagePlus className="w-5 h-5 text-slate-300" />
                            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                              onChange={(e) => { const file = e.target.files?.[0]; e.target.value = ''; if (file) uploadInfoBlockImage(i, file) }} />
                          </label>
                        )}
                        <div className="flex-1 space-y-2">
                          <input type="text" value={b.title ?? ''} onChange={(e) => updateInfoBlock(i, { title: e.target.value })}
                            placeholder="Title (optional)" className={smallInputCls} />
                          <textarea value={b.description} onChange={(e) => updateInfoBlock(i, { description: e.target.value })}
                            placeholder="Description" rows={2} className={`${smallInputCls} resize-none`} />
                        </div>
                        <button type="button" onClick={() => removeInfoBlock(i)} className="p-2 text-slate-400 hover:text-red-500 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Supplement Info</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelCls}>Age Group</label>
                      <input type="text" value={form.supplementInfo.ageGroup ?? ''} onChange={(e) => set({ supplementInfo: { ...form.supplementInfo, ageGroup: e.target.value } })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Dietary Use</label>
                      <input type="text" value={form.supplementInfo.dietaryUse ?? ''} onChange={(e) => set({ supplementInfo: { ...form.supplementInfo, dietaryUse: e.target.value } })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Flavor</label>
                      <input type="text" value={form.supplementInfo.flavor ?? ''} onChange={(e) => set({ supplementInfo: { ...form.supplementInfo, flavor: e.target.value } })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Ingredient Category</label>
                      <input type="text" value={form.supplementInfo.ingredientCategory ?? ''} onChange={(e) => set({ supplementInfo: { ...form.supplementInfo, ingredientCategory: e.target.value } })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Route of Administration</label>
                      <input type="text" value={form.supplementInfo.routeOfAdministration ?? ''} onChange={(e) => set({ supplementInfo: { ...form.supplementInfo, routeOfAdministration: e.target.value } })} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>Health Focus (comma-separated)</label>
                      <input type="text" value={(form.supplementInfo.healthFocus ?? []).join(', ')}
                        onChange={(e) => set({ supplementInfo: { ...form.supplementInfo, healthFocus: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) } })}
                        className={inputCls} />
                    </div>
                  </div>
                </div>
              </div>
            </Collapsible>
          </div>

          {/* Shipping */}
          <div className={`${cardCls} space-y-4`}>
            <Collapsible
              title="Shipping"
              description="Weight, packaging, and customs details used for delivery."
              defaultOpen
            >
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1">
                  <Truck className="w-4 h-4 text-slate-400" />
                  <Toggle
                    checked={form.shipping.isPhysical}
                    onChange={(v) => setShipping({ isPhysical: v })}
                    label="This is a physical product"
                    description="Digital products skip weight, packaging, and customs"
                  />
                </div>

                {form.shipping.isPhysical && (
                  <>
                    {/* Shipping charge mode */}
                    <div className="rounded-lg border border-slate-200 p-4 space-y-3">
                      <p className="text-sm font-medium text-slate-700">Shipping charge</p>
                      <div className="space-y-2">
                        {([
                          { value: 'calculated', label: 'Calculated', desc: 'Rate quoted by carrier (Shiprocket) based on weight and destination' },
                          { value: 'fixed',      label: 'Fixed rate',  desc: 'A flat charge set by you, regardless of weight' },
                          { value: 'free',       label: 'Free / Inclusive', desc: 'No shipping charge — included in the product price' },
                        ] as const).map((opt) => (
                          <label key={opt.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${form.shipping.shippingMode === opt.value ? 'border-[#558476] bg-[#558476]/5' : 'border-slate-200 hover:border-slate-300'}`}>
                            <input
                              type="radio"
                              name="shippingMode"
                              value={opt.value}
                              checked={form.shipping.shippingMode === opt.value}
                              onChange={() => setShipping({ shippingMode: opt.value })}
                              className="mt-0.5 accent-[#558476]"
                            />
                            <div>
                              <p className="text-sm font-medium text-slate-800">{opt.label}</p>
                              <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                      {form.shipping.shippingMode === 'fixed' && (
                        <div className="pt-1">
                          <label className={labelCls}>Fixed shipping rate (₹)</label>
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={form.shipping.fixedShippingRate ?? ''}
                            onChange={(e) => setShipping({ fixedShippingRate: e.target.value ? Number(e.target.value) : undefined })}
                            placeholder="e.g. 50"
                            className={inputCls}
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className={labelCls}>Package</label>
                      <input
                        type="text"
                        list="package-suggestions"
                        value={form.shipping.packageType ?? ''}
                        onChange={(e) => setShipping({ packageType: e.target.value })}
                        placeholder="e.g. Poly Mailer, Box, Custom Package"
                        className={inputCls}
                      />
                      <datalist id="package-suggestions">
                        {PACKAGE_SUGGESTIONS.map((p) => <option key={p} value={p} />)}
                      </datalist>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Weight</label>
                        <input type="number" min={0} value={form.shipping.weight ?? ''}
                          onChange={(e) => setShipping({ weight: e.target.value ? Number(e.target.value) : undefined })}
                          placeholder="e.g. 250" className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>Unit</label>
                        <select value={form.shipping.weightUnit} onChange={(e) => setShipping({ weightUnit: e.target.value as WeightUnit })} className={inputCls}>
                          {WEIGHT_UNITS.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                      <Collapsible title="Customs Information" defaultOpen={false}>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={labelCls}>Country/Region of Origin</label>
                            <input type="text" value={form.shipping.countryOfOrigin ?? ''} onChange={(e) => setShipping({ countryOfOrigin: e.target.value })}
                              placeholder="e.g. India" className={inputCls} />
                          </div>
                          <div>
                            <label className={labelCls}>Harmonized System (HS) Code</label>
                            <input type="text" value={form.shipping.hsCode ?? ''} onChange={(e) => setShipping({ hsCode: e.target.value })}
                              placeholder="e.g. 2106.90" className={inputCls} />
                          </div>
                        </div>
                      </Collapsible>
                    </div>
                  </>
                )}
              </div>
            </Collapsible>
          </div>
        </div>

        {/* Sidebar — 1/3 */}
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Status</h3>
              <select value={form.status} onChange={(e) => { const status = e.target.value as ProductStatus; set({ status, isPublished: status === 'active' }) }} className={inputCls}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
              <p className={helpCls}>
                {form.status === 'active' ? 'Available for sale' : form.status === 'draft' ? 'Work in progress' : 'Removed from store'}
              </p>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <Toggle
                checked={form.isSubscribable}
                onChange={(v) => set({ isSubscribable: v })}
                label="Available for Subscription"
                description="Shows the Subscribe & Save purchase option on the product page"
              />
            </div>
          </div>

          {/* SEO / URL */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Search Engine Listing</h3>
            <div>
              <label className={labelCls}>Slug</label>
              <div className="flex items-center gap-1 px-3 rounded-lg border border-slate-200 bg-slate-50 focus-within:ring-2 focus-within:ring-[#558476]">
                <span className="text-sm text-slate-400 whitespace-nowrap">/products/</span>
                <input
                  type="text"
                  value={form.seo.slug}
                  onChange={(e) => {
                    setSlugTouched(true)
                    setSeo({ slug: slugify(e.target.value) })
                  }}
                  placeholder="fuyl-complete"
                  className="w-full py-2.5 bg-transparent text-slate-900 text-sm focus:outline-none"
                />
              </div>
              <p className={helpCls}>
                {isNew ? 'Auto-filled from the name — edit to customize.' : "Changing this changes the product's live URL."}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelCls + ' mb-0'}>Meta Title</label>
                <span className="text-xs text-slate-400">{(form.seo.metaTitle ?? '').length}/200</span>
              </div>
              <input type="text" value={form.seo.metaTitle ?? ''} onChange={(e) => setSeo({ metaTitle: e.target.value.slice(0, 200) })}
                placeholder="Defaults to the product name" maxLength={200} className={inputCls} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={labelCls + ' mb-0'}>Meta Description</label>
                <span className="text-xs text-slate-400">{(form.seo.metaDescription ?? '').length}/500</span>
              </div>
              <textarea value={form.seo.metaDescription ?? ''} onChange={(e) => setSeo({ metaDescription: e.target.value.slice(0, 500) })} rows={3}
                placeholder="Shown in search engine results" maxLength={500} className={`${inputCls} resize-none`} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function VariantRow({
  variant, index, attributes, isUploading,
  onUpdate, onRemove, onFileChange, onRemoveImage, onAddAttribute, onSetAttributeValue, onRemoveAttribute,
}: {
  variant: AdminVariant
  index: number
  attributes: AttributeDef[]
  isUploading: boolean
  onUpdate: (patch: Partial<AdminVariant>) => void
  onRemove: () => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveImage: (imgIdx: number) => void
  onAddAttribute: (key: string) => void
  onSetAttributeValue: (key: string, value: string) => void
  onRemoveAttribute: (key: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [newAttrKey, setNewAttrKey] = useState('')

  return (
    <div className="border border-slate-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Variant {index + 1}</p>
        <button type="button" onClick={onRemove} className="p-1.5 text-slate-400 hover:text-red-500" title="Remove variant">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Name</label>
          <input type="text" value={variant.name} onChange={(e) => onUpdate({ name: e.target.value })} placeholder="e.g. 500g Berry" className={smallInputCls} />
        </div>
        <div>
          <label className={labelCls}>SKU</label>
          <input type="text" value={variant.sku} onChange={(e) => onUpdate({ sku: e.target.value })} placeholder="e.g. FC-500-BRY" className={`${smallInputCls} font-mono`} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className={labelCls}>Price (₹)</label>
          <input type="number" min={0.01} step="0.01" value={variant.price} onChange={(e) => onUpdate({ price: Number(e.target.value) })} className={smallInputCls} />
        </div>
        <div>
          <label className={labelCls}>Compare-at (₹)</label>
          <input type="number" min={0} step="0.01" value={variant.compareAtPrice ?? ''} onChange={(e) => onUpdate({ compareAtPrice: e.target.value ? Number(e.target.value) : undefined })} className={smallInputCls} />
        </div>
        <div>
          <label className={labelCls}>Stock</label>
          <input type="number" min={0} step={1} value={variant.stock} onChange={(e) => onUpdate({ stock: Number(e.target.value) })} className={smallInputCls} />
        </div>
        <div>
          <label className={labelCls}>Weight (g)</label>
          <input type="number" min={0} value={variant.weight ?? ''} onChange={(e) => onUpdate({ weight: e.target.value ? Number(e.target.value) : undefined })} className={smallInputCls} />
        </div>
      </div>

      {/* Attributes */}
      <div>
        <label className={labelCls}>Attributes</label>
        <div className="flex flex-wrap gap-2 mb-2">
          {Object.entries(variant.attributes).map(([key, value]) => (
            <div key={key} className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg pl-2.5 pr-1 py-1">
              <span className="text-xs font-medium text-slate-500">{key}:</span>
              <input type="text" value={value} onChange={(e) => onSetAttributeValue(key, e.target.value)}
                className="text-xs w-20 bg-transparent focus:outline-none text-slate-900" placeholder="value" />
              <button type="button" onClick={() => onRemoveAttribute(key)} className="p-0.5 text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input type="text" list={`attr-suggestions-${index}`} value={newAttrKey} onChange={(e) => setNewAttrKey(e.target.value)}
            placeholder="e.g. size, flavor, color" className={`${smallInputCls} max-w-48`} />
          <datalist id={`attr-suggestions-${index}`}>
            {attributes.map((a) => <option key={a.slug} value={a.slug} />)}
          </datalist>
          <button type="button" onClick={() => { onAddAttribute(newAttrKey); setNewAttrKey('') }}
            className="flex items-center gap-1 text-xs font-medium text-[#558476] hover:underline whitespace-nowrap">
            <Plus className="w-3.5 h-3.5" /> Add attribute
          </button>
        </div>
      </div>

      {/* Variant images */}
      <div>
        <label className={labelCls}>Images</label>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={onFileChange} />
        <div className="flex flex-wrap gap-2">
          {variant.images.map((url, i) => (
            <div key={`${url}-${i}`} className="relative group w-14 h-14">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full rounded-lg object-cover border border-slate-200" />
              <button type="button" onClick={() => onRemoveImage(i)}
                className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button type="button" onClick={() => fileRef.current?.click()} disabled={isUploading}
            className="w-14 h-14 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center hover:border-[#558476]/40 transition-colors disabled:opacity-60">
            <ImagePlus className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>
    </div>
  )
}
