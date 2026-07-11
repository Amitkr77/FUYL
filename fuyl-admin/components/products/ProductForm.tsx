'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Trash2, CheckCircle2, ImagePlus, AlertCircle, Star, X, Plus } from 'lucide-react'
import type {
  AdminProduct, Category, AttributeDef, ProductStatus, AdminVariant,
  AdditionalPrice, FAQEntry, CertificationEntry,
} from '@/lib/products'
import { createProductAction, updateProductAction, archiveProductAction, getProductImageUploadSignature } from '@/app/(admin)/products/actions'
import { uploadImage } from '@/lib/upload'

interface Props {
  product?: AdminProduct
  categories: Category[]
  attributes: AttributeDef[]
  isNew?: boolean
}

const inputCls =
  'w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent'
const smallInputCls =
  'w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent'
const labelCls = 'block text-sm font-medium text-slate-700 mb-1.5'
const cardCls = 'bg-white border border-slate-200 rounded-xl shadow-sm p-6'

function emptyVariant(defaultPrice: number): AdminVariant {
  return { id: '', sku: '', name: '', attributes: {}, price: defaultPrice, compareAtPrice: undefined, stock: 0, images: [], weight: undefined }
}

export function ProductForm({ product, categories, attributes, isNew = false }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name:        product?.name ?? '',
    categoryId:  product?.categoryId ?? categories[0]?.id ?? '',
    description: product?.description ?? '',
    status:      product?.status ?? ('draft' as ProductStatus),
    isPublished:    product?.isPublished ?? true,
    isSubscribable: product?.isSubscribable ?? false,
    images:      product?.images ?? [],
    price:            product?.price ?? 1499,
    compareAtPrice:   product?.compareAtPrice,
    additionalPrices: product?.additionalPrices ?? [],
    unitPriceValue:   product?.unitPriceValue,
    unitPriceUnit:    product?.unitPriceUnit ?? '',
    isTaxable:        product?.isTaxable ?? true,
    costPerItem:      product?.costPerItem,
    benefits:         product?.benefits ?? [],
    faqs:             product?.faqs ?? [],
    certifications:   product?.certifications ?? [],
    supplementInfo:   product?.supplementInfo ?? {},
  })
  const set = (k: Partial<typeof form>) => setForm((f) => ({ ...f, ...k }))

  const [variants, setVariants] = useState<AdminVariant[]>(
    product?.variants.length ? product.variants : [emptyVariant(form.price)]
  )
  const updateVariant = (i: number, patch: Partial<AdminVariant>) =>
    setVariants((vs) => vs.map((v, idx) => (idx === i ? { ...v, ...patch } : v)))
  const addVariant = () => setVariants((vs) => [...vs, emptyVariant(form.price)])
  const removeVariant = (i: number) => setVariants((vs) => vs.filter((_, idx) => idx !== i))

  const profit = form.costPerItem != null ? form.price - form.costPerItem : null
  const margin = profit != null && form.price > 0 ? (profit / form.price) * 100 : null

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

  const handleSave = () => {
    setError('')
    if (variants.some((v) => !v.sku.trim())) {
      setError('Every variant needs a SKU.')
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
          <Link href="/products" className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
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
              <input type="text" value={form.name} onChange={(e) => set({ name: e.target.value })}
                placeholder="e.g. FUYL COMPLETE+" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Category</label>
              {categories.length === 0 ? (
                <p className="text-xs text-slate-400 py-2.5">No categories yet</p>
              ) : (
                <select value={form.categoryId} onChange={(e) => set({ categoryId: e.target.value })} className={inputCls}>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} rows={4}
                placeholder="Describe the product..." className={`${inputCls} resize-none`} />
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
            <p className="text-xs text-slate-400 mt-3">PNG, JPG, WEBP · first image is the cover shown in listings</p>
          </div>

          {/* Pricing */}
          <div className={`${cardCls} space-y-4`}>
            <h3 className="text-sm font-semibold text-slate-900">Pricing</h3>
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

            <div className="grid grid-cols-2 gap-4 items-end">
              <div>
                <label className={labelCls}>Cost per Item (₹)</label>
                <input type="number" value={form.costPerItem ?? ''} onChange={(e) => set({ costPerItem: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="Admin only" className={inputCls} />
              </div>
              <label className="flex items-center gap-2.5 pb-2.5 cursor-pointer">
                <input type="checkbox" checked={form.isTaxable} onChange={(e) => set({ isTaxable: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-[#558476] focus:ring-[#558476]" />
                <span className="text-sm font-medium text-slate-900">Charge tax on this product</span>
              </label>
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

          {/* Variants */}
          <div className={`${cardCls} space-y-4`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Variants</h3>
                <p className="text-xs text-slate-400 mt-0.5">e.g. Size, Flavor, Pack Size, Color — each variant has its own price, SKU, stock and images</p>
              </div>
              <button type="button" onClick={addVariant} className="flex items-center gap-1 text-xs font-medium text-[#558476] hover:underline">
                <Plus className="w-3.5 h-3.5" /> Add variant
              </button>
            </div>

            <div className="space-y-4">
              {variants.map((v, i) => (
                <VariantRow
                  key={v.id || `new-${i}`}
                  variant={v}
                  index={i}
                  attributes={attributes}
                  isOnlyVariant={variants.length === 1}
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
          </div>

          {/* Metafields */}
          <div className={`${cardCls} space-y-5`}>
            <h3 className="text-sm font-semibold text-slate-900">Product Details</h3>

            <div>
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
        </div>

        {/* Sidebar — 1/3 */}
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Status</h3>
              <select value={form.status} onChange={(e) => set({ status: e.target.value as ProductStatus })} className={inputCls}>
                <option value="active">Active</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
              <p className="text-xs text-slate-400 mt-2">
                {form.status === 'active' ? 'Available for sale' : form.status === 'draft' ? 'Work in progress' : 'Removed from store'}
              </p>
            </div>
            <label className="flex items-start gap-2.5 pt-3 border-t border-slate-100 cursor-pointer">
              <input type="checkbox" checked={form.isPublished} onChange={(e) => set({ isPublished: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#558476] focus:ring-[#558476]" />
              <span>
                <span className="block text-sm font-medium text-slate-900">Published</span>
                <span className="block text-xs text-slate-400">{form.isPublished ? 'Visible on the storefront' : 'Hidden from customers, regardless of status'}</span>
              </span>
            </label>
            <label className="flex items-start gap-2.5 pt-3 border-t border-slate-100 cursor-pointer">
              <input type="checkbox" checked={form.isSubscribable} onChange={(e) => set({ isSubscribable: e.target.checked })}
                className="mt-0.5 w-4 h-4 rounded border-slate-300 text-[#558476] focus:ring-[#558476]" />
              <span>
                <span className="block text-sm font-medium text-slate-900">Available for Subscription</span>
                <span className="block text-xs text-slate-400">Shows the Subscribe &amp; Save purchase option on the product page</span>
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

function VariantRow({
  variant, index, attributes, isOnlyVariant, isUploading,
  onUpdate, onRemove, onFileChange, onRemoveImage, onAddAttribute, onSetAttributeValue, onRemoveAttribute,
}: {
  variant: AdminVariant
  index: number
  attributes: AttributeDef[]
  isOnlyVariant: boolean
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
        {!isOnlyVariant && (
          <button type="button" onClick={onRemove} className="p-1.5 text-slate-400 hover:text-red-500" title="Remove variant">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
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
          <input type="number" value={variant.price} onChange={(e) => onUpdate({ price: Number(e.target.value) })} className={smallInputCls} />
        </div>
        <div>
          <label className={labelCls}>Compare-at (₹)</label>
          <input type="number" value={variant.compareAtPrice ?? ''} onChange={(e) => onUpdate({ compareAtPrice: e.target.value ? Number(e.target.value) : undefined })} className={smallInputCls} />
        </div>
        <div>
          <label className={labelCls}>Stock</label>
          <input type="number" value={variant.stock} onChange={(e) => onUpdate({ stock: Number(e.target.value) })} className={smallInputCls} />
        </div>
        <div>
          <label className={labelCls}>Weight (g)</label>
          <input type="number" value={variant.weight ?? ''} onChange={(e) => onUpdate({ weight: e.target.value ? Number(e.target.value) : undefined })} className={smallInputCls} />
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
