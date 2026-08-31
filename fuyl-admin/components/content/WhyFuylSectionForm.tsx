'use client'

import { useRef, useState, useTransition } from 'react'
import { ImagePlus, CheckCircle2, AlertCircle } from 'lucide-react'
import type { WhyFuylSection } from '@/lib/content'
import { updateWhyFuylAction, getContentImageUploadSignature } from '@/app/(admin)/content/actions'
import { uploadImage } from '@/lib/upload'
import { useContentDraftGuard } from './useContentDraftGuard'

const INPUT = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#558476] focus:ring-2 focus:ring-[#558476]/20'
const LABEL = 'mb-1.5 block text-xs font-semibold text-slate-700'

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
      <label className="flex items-center gap-3 cursor-pointer">
        <div className="relative">
          <input type="checkbox" className="sr-only peer" checked={section.isActive} onChange={(e) => setSection((s) => ({ ...s, isActive: e.target.checked }))} />
          <div className="h-5 w-9 rounded-full bg-slate-200 peer-checked:bg-[#558476] transition-colors" />
          <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
        </div>
        <span className="text-sm font-medium text-slate-700">Show this page on the storefront</span>
      </label>

      <div className={`space-y-5 ${!section.isActive ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Hero section */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hero section</h3>

          <label className="block">
            <span className={LABEL}>Headline</span>
            <input value={section.data.heroHeadline} onChange={(e) => setData({ heroHeadline: e.target.value })} placeholder="WHY FUYL COMPLETE+ IS DIFFERENT" className={INPUT} />
          </label>

          <label className="block">
            <span className={LABEL}>Description</span>
            <textarea rows={4} value={section.data.heroDescription} onChange={(e) => setData({ heroDescription: e.target.value })} className={`${INPUT} resize-y`} />
          </label>

          {/* Hero image */}
          <div>
            <span className={LABEL}>Hero image</span>
            <input ref={imgRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageUpload} />
            {section.data.heroImage ? (
              <div className="group relative h-40 rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={section.data.heroImage} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button type="button" onClick={() => imgRef.current?.click()} disabled={uploading} className="rounded bg-white px-2.5 py-1 text-xs font-medium text-slate-700">{uploading ? 'Uploading…' : 'Replace'}</button>
                  <button type="button" onClick={() => setData({ heroImage: '' })} className="rounded bg-white px-2.5 py-1 text-xs font-medium text-red-500">Remove</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => imgRef.current?.click()} disabled={uploading} className="flex h-40 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-400 hover:border-[#558476] hover:text-[#558476] transition-colors disabled:opacity-60">
                <ImagePlus className="h-5 w-5" /> {uploading ? 'Uploading…' : 'Upload hero image'}
              </button>
            )}
            <input value={section.data.heroImage} onChange={(e) => setData({ heroImage: e.target.value })} placeholder="Or paste image URL…" className={`mt-1.5 ${INPUT} text-xs`} />
            {uploadError && <p className="mt-1 flex items-center gap-1.5 text-xs text-red-600"><AlertCircle className="h-3.5 w-3.5" />{uploadError}</p>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className={LABEL}>CTA label</span>
              <input value={section.data.ctaLabel} onChange={(e) => setData({ ctaLabel: e.target.value })} placeholder="e.g. Taste Now" className={INPUT} />
            </label>
            <label className="block">
              <span className={LABEL}>CTA link</span>
              <input value={section.data.ctaHref} onChange={(e) => setData({ ctaHref: e.target.value })} placeholder="/products/fuyl-complete" className={INPUT} />
            </label>
          </div>
        </div>

        {/* Pillars section */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pillars section</h3>

          <label className="block">
            <span className={LABEL}>Headline</span>
            <input value={section.data.pillarsHeadline} onChange={(e) => setData({ pillarsHeadline: e.target.value })} placeholder="PILLARS THAT MAKE FUYL" className={INPUT} />
          </label>

          <label className="block">
            <span className={LABEL}>Subheadline</span>
            <input value={section.data.pillarsSubheadline} onChange={(e) => setData({ pillarsSubheadline: e.target.value })} placeholder="DISCOVER THE USPs THAT MAKE OUR PRODUCTS EXCEPTIONAL" className={INPUT} />
          </label>
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
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  )
}
