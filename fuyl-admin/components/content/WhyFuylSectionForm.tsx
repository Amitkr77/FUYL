'use client'

import { useRef, useState, useTransition } from 'react'
import { ImagePlus, CheckCircle2, AlertCircle } from 'lucide-react'
import type { WhyFuylSection } from '@/lib/content'
import { updateWhyFuylAction, getContentImageUploadSignature } from '@/app/(admin)/content/actions'
import { uploadImage } from '@/lib/upload'
import { useContentDraftGuard } from './useContentDraftGuard'
import { Input, Textarea, Toggle } from '@/components/ui/form'

export function WhyFuylSectionForm({ initial }: { initial: WhyFuylSection }) {
  const [section, setSection] = useState(initial)
  const [result, setResult] = useState<{ error?: string; ok?: true } | null>(null)
  const [pending, startTransition] = useTransition()
  const { markSaved } = useContentDraftGuard(section)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const imgRef = useRef<HTMLInputElement>(null)

  const setData = (patch: Partial<typeof section.data>) =>
    setSection((s) => ({ ...s, data: { ...s.data, ...patch } }))

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setUploadError(''); setUploading(true)
    const res = await uploadImage(file, getContentImageUploadSignature)
    setUploading(false)
    if ('error' in res) { setUploadError(res.error); return }
    setData({ heroImage: res.url })
  }

  const save = () => {
    setResult(null)
    startTransition(async () => {
      const res = await updateWhyFuylAction(section)
      setResult(res.error ? { error: res.error } : { ok: true })
      if (!res.error) markSaved(section)
    })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
      {/* Active toggle */}
      <Toggle
        checked={section.isActive}
        onChange={(v) => setSection((s) => ({ ...s, isActive: v }))}
        label="Show this page on the storefront"
      />

      <div className={`space-y-5 ${!section.isActive ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Hero section */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hero section</h3>

          <Input label="Headline" value={section.data.heroHeadline} onChange={(e) => setData({ heroHeadline: e.target.value })} placeholder="WHY FUYL COMPLETE+ IS DIFFERENT" />
          <Textarea label="Description" rows={4} value={section.data.heroDescription} onChange={(e) => setData({ heroDescription: e.target.value })} />

          {/* Hero image */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">Hero image</span>
            <input ref={imgRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageUpload} />
            {section.data.heroImage ? (
              <div className="group relative h-40 rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={section.data.heroImage} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button type="button" onClick={() => imgRef.current?.click()} disabled={uploading} className="rounded bg-white px-2.5 py-1 text-xs font-medium text-slate-700">{uploading ? 'Uploading\u2026' : 'Replace'}</button>
                  <button type="button" onClick={() => setData({ heroImage: '' })} className="rounded bg-white px-2.5 py-1 text-xs font-medium text-red-500">Remove</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => imgRef.current?.click()} disabled={uploading} className="flex h-40 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-400 hover:border-[#558476] hover:text-[#558476] transition-colors disabled:opacity-60">
                <ImagePlus className="h-5 w-5" /> {uploading ? 'Uploading\u2026' : 'Upload hero image'}
              </button>
            )}
            <Input value={section.data.heroImage} onChange={(e) => setData({ heroImage: e.target.value })} placeholder="Or paste image URL\u2026" className="mt-1.5" />
            {uploadError && <p className="mt-1 flex items-center gap-1.5 text-xs text-red-600"><AlertCircle className="h-3.5 w-3.5" />{uploadError}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="CTA label" value={section.data.ctaLabel} onChange={(e) => setData({ ctaLabel: e.target.value })} placeholder="e.g. Taste Now" />
            <Input label="CTA link" value={section.data.ctaHref} onChange={(e) => setData({ ctaHref: e.target.value })} placeholder="/products/fuyl-complete" />
          </div>
        </div>

        {/* Pillars section */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pillars section</h3>
          <Input label="Headline" value={section.data.pillarsHeadline} onChange={(e) => setData({ pillarsHeadline: e.target.value })} placeholder="PILLARS THAT MAKE FUYL" />
          <Input label="Subheadline" value={section.data.pillarsSubheadline} onChange={(e) => setData({ pillarsSubheadline: e.target.value })} placeholder="DISCOVER THE USPs THAT MAKE OUR PRODUCTS EXCEPTIONAL" />
        </div>
      </div>

      {result?.error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />{result.error}
        </div>
      )}
      {result?.ok && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />Saved successfully
        </div>
      )}

      <button
        type="button"
        onClick={save}
        disabled={pending}
        className="rounded-lg bg-[#558476] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#457366] disabled:opacity-60 transition-colors"
      >
        {pending ? 'Saving\u2026' : 'Save changes'}
      </button>
    </div>
  )
}
