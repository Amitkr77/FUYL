'use client'

import { useRef, useState, useTransition } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, ImagePlus, Film, CheckCircle2, AlertCircle, EyeOff } from 'lucide-react'
import type { HeroSection, HeroSlide } from '@/lib/content'
import { updateHeroAction, getContentImageUploadSignature, getContentVideoUploadSignature } from '@/app/(admin)/content/actions'
import { uploadImage } from '@/lib/upload'

const INPUT = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#558476] focus:ring-2 focus:ring-[#558476]/20'

function blankSlide(): HeroSlide {
  return {
    id: crypto.randomUUID(),
    mediaType: 'image',
    eyebrow: '',
    headline: '',
    subheading: '',
    image: '',
    imageAlt: '',
    video: '',
    isActive: true,
    primaryCtaLabel: 'Shop now',
    primaryCtaHref: '/products',
    secondaryCtaLabel: '',
    secondaryCtaHref: '',
  }
}

function SlideCard({
  slide,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  slide: HeroSlide
  index: number
  total: number
  onChange: (key: keyof HeroSlide, value: string | boolean) => void
  onRemove: () => void
  onMove: (dir: 'up' | 'down') => void
}) {
  const imgRef = useRef<HTMLInputElement>(null)
  const vidRef = useRef<HTMLInputElement>(null)
  const [imgUploading, setImgUploading] = useState(false)
  const [vidUploading, setVidUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setUploadError(''); setImgUploading(true)
    const res = await uploadImage(file, getContentImageUploadSignature)
    setImgUploading(false)
    if ('error' in res) { setUploadError(res.error); return }
    onChange('image', res.url)
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setUploadError(''); setVidUploading(true)
    const res = await uploadImage(file, getContentVideoUploadSignature)
    setVidUploading(false)
    if ('error' in res) { setUploadError(res.error); return }
    onChange('video', res.url)
  }

  return (
    <div className={`rounded-xl border bg-white shadow-sm overflow-hidden ${!slide.isActive ? 'opacity-60' : ''}`}>
      {/* Slide header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700">Slide {index + 1}</span>
          {!slide.isActive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
              <EyeOff className="h-3 w-3" /> Hidden
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onMove('up')} disabled={index === 0} aria-label="Move up" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"><ChevronUp className="h-4 w-4" /></button>
          <button onClick={() => onMove('down')} disabled={index === total - 1} aria-label="Move down" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"><ChevronDown className="h-4 w-4" /></button>
          <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <input type="checkbox" checked={slide.isActive} onChange={(e) => onChange('isActive', e.target.checked)} className="h-3.5 w-3.5 accent-[#558476]" />
            Active
          </label>
          <button onClick={onRemove} disabled={total <= 1} className="ml-1 rounded p-1.5 text-red-400 hover:bg-red-50 disabled:opacity-30 transition-colors"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Media type toggle */}
        <div>
          <span className="mb-2 block text-xs font-semibold text-slate-700">Background media</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onChange('mediaType', 'image')}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${slide.mediaType === 'image' ? 'border-[#558476] bg-[#558476]/10 text-[#558476]' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <ImagePlus className="h-3.5 w-3.5" /> Image
            </button>
            <button
              type="button"
              onClick={() => onChange('mediaType', 'video')}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${slide.mediaType === 'video' ? 'border-[#558476] bg-[#558476]/10 text-[#558476]' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
            >
              <Film className="h-3.5 w-3.5" /> Video
            </button>
          </div>
        </div>

        {/* Media upload zone */}
        <input ref={imgRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageUpload} />
        <input ref={vidRef} type="file" accept="video/mp4,video/webm,video/mov" className="hidden" onChange={handleVideoUpload} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Image upload / preview */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">
              {slide.mediaType === 'video' ? 'Poster / thumbnail image' : 'Image'}
            </span>
            {slide.image ? (
              <div className="group relative h-32 rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slide.image} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button type="button" onClick={() => imgRef.current?.click()} disabled={imgUploading} className="rounded bg-white px-2.5 py-1 text-xs font-medium text-slate-700">{imgUploading ? 'Uploading…' : 'Replace'}</button>
                  <button type="button" onClick={() => onChange('image', '')} className="rounded bg-white px-2.5 py-1 text-xs font-medium text-red-500">Remove</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => imgRef.current?.click()} disabled={imgUploading} className="flex h-32 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-400 hover:border-[#558476] hover:text-[#558476] transition-colors disabled:opacity-60">
                <ImagePlus className="h-5 w-5" /> {imgUploading ? 'Uploading…' : 'Upload image'}
              </button>
            )}
            <input value={slide.image} onChange={(e) => onChange('image', e.target.value)} placeholder="Or paste URL…" className={`mt-1.5 ${INPUT} text-xs`} />
          </div>

          {/* Video upload / preview (always shown so poster can coexist) */}
          {slide.mediaType === 'video' && (
            <div>
              <span className="mb-1.5 block text-xs font-semibold text-slate-700">Video file</span>
              {slide.video ? (
                <div className="group relative h-32 rounded-lg border border-slate-200 overflow-hidden bg-slate-900">
                  <video src={slide.video} className="h-full w-full object-cover opacity-80" muted playsInline />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button type="button" onClick={() => vidRef.current?.click()} disabled={vidUploading} className="rounded bg-white px-2.5 py-1 text-xs font-medium text-slate-700">{vidUploading ? 'Uploading…' : 'Replace'}</button>
                    <button type="button" onClick={() => onChange('video', '')} className="rounded bg-white px-2.5 py-1 text-xs font-medium text-red-500">Remove</button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => vidRef.current?.click()} disabled={vidUploading} className="flex h-32 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-400 hover:border-[#558476] hover:text-[#558476] transition-colors disabled:opacity-60">
                  <Film className="h-5 w-5" /> {vidUploading ? 'Uploading…' : 'Upload video'}
                </button>
              )}
              <input value={slide.video} onChange={(e) => onChange('video', e.target.value)} placeholder="Or paste video URL…" className={`mt-1.5 ${INPUT} text-xs`} />
            </div>
          )}
        </div>

        {uploadError && (
          <p className="flex items-center gap-1.5 text-xs text-red-600"><AlertCircle className="h-3.5 w-3.5" />{uploadError}</p>
        )}

        {/* Copy */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-700">Eyebrow label</span>
            <input value={slide.eyebrow} onChange={(e) => onChange('eyebrow', e.target.value)} placeholder="e.g. Introducing FUYL COMPLETE+" className={INPUT} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-700">Image alt text</span>
            <input value={slide.imageAlt} onChange={(e) => onChange('imageAlt', e.target.value)} placeholder="Describe the image for accessibility" className={INPUT} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-slate-700">Headline <span className="font-normal text-slate-400">(new line = line break)</span></span>
            <textarea rows={3} value={slide.headline} onChange={(e) => onChange('headline', e.target.value)} placeholder={"Nourish Daily.\nFeel Stronger.\nLive longer."} className={`${INPUT} resize-none`} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold text-slate-700">Subheading</span>
            <textarea rows={2} value={slide.subheading} onChange={(e) => onChange('subheading', e.target.value)} className={`${INPUT} resize-none`} />
          </label>
        </div>

        {/* CTAs */}
        <div>
          <span className="mb-2 block text-xs font-semibold text-slate-700">Call-to-action buttons</span>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">Primary label</span>
              <input value={slide.primaryCtaLabel} onChange={(e) => onChange('primaryCtaLabel', e.target.value)} placeholder="e.g. Shop now" className={INPUT} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">Primary link</span>
              <input value={slide.primaryCtaHref} onChange={(e) => onChange('primaryCtaHref', e.target.value)} placeholder="/products" className={INPUT} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">Secondary label (optional)</span>
              <input value={slide.secondaryCtaLabel ?? ''} onChange={(e) => onChange('secondaryCtaLabel', e.target.value)} placeholder="e.g. Learn more" className={INPUT} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">Secondary link</span>
              <input value={slide.secondaryCtaHref ?? ''} onChange={(e) => onChange('secondaryCtaHref', e.target.value)} placeholder="/pages/about" className={INPUT} />
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}

export function HeroSectionForm({ initial }: { initial: HeroSection }) {
  const [hero, setHero] = useState(initial)
  const [result, setResult] = useState<{ error?: string; ok?: true } | null>(null)
  const [pending, startTransition] = useTransition()

  const updateSlide = (index: number, key: keyof HeroSlide, value: string | boolean) => {
    setHero((h) => ({
      ...h,
      data: {
        ...h.data,
        slides: h.data.slides.map((s, i) => i === index ? { ...s, [key]: value } : s),
      },
    }))
  }

  const removeSlide = (index: number) => {
    setHero((h) => ({ ...h, data: { ...h.data, slides: h.data.slides.filter((_, i) => i !== index) } }))
  }

  const moveSlide = (index: number, dir: 'up' | 'down') => {
    const slides = [...hero.data.slides]
    const target = dir === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= slides.length) return;
    [slides[index], slides[target]] = [slides[target], slides[index]]
    setHero((h) => ({ ...h, data: { ...h.data, slides } }))
  }

  const addSlide = () => {
    setHero((h) => ({ ...h, data: { ...h.data, slides: [...h.data.slides, blankSlide()] } }))
  }

  const save = () => {
    setResult(null)
    startTransition(async () => {
      const res = await updateHeroAction(hero)
      setResult(res.error ? { error: res.error } : { ok: true })
    })
  }

  const activeCount = hero.data.slides.filter((s) => s.isActive !== false).length

  return (
    <div className="space-y-5">
      {/* Settings card */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Hero settings</h3>
        <div className="flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input type="checkbox" className="sr-only peer" checked={hero.isActive} onChange={(e) => setHero((h) => ({ ...h, isActive: e.target.checked }))} />
              <div className="h-5 w-9 rounded-full bg-slate-200 peer-checked:bg-[#558476] transition-colors" />
              <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
            </div>
            <span className="text-sm font-medium text-slate-700">Visible on storefront</span>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-700">Autoplay speed (ms)</span>
            <input
              type="number"
              min={2000}
              step={500}
              value={hero.data.autoplayMs}
              onChange={(e) => setHero((h) => ({ ...h, data: { ...h.data, autoplayMs: Number(e.target.value) } }))}
              className="w-36 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#558476] focus:ring-2 focus:ring-[#558476]/20"
            />
          </label>
          <p className="text-xs text-slate-400 self-end pb-0.5">{activeCount} of {hero.data.slides.length} slides active</p>
        </div>
      </div>

      {/* Slides */}
      {hero.data.slides.map((slide, i) => (
        <SlideCard
          key={slide.id}
          slide={slide}
          index={i}
          total={hero.data.slides.length}
          onChange={(key, value) => updateSlide(i, key, value)}
          onRemove={() => removeSlide(i)}
          onMove={(dir) => moveSlide(i, dir)}
        />
      ))}

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={addSlide}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Plus className="h-4 w-4" /> Add slide
        </button>

        <div className="flex items-center gap-3">
          {result?.error && (
            <span className="flex items-center gap-1.5 text-sm text-red-600"><AlertCircle className="h-4 w-4" />{result.error}</span>
          )}
          {result?.ok && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" />Saved</span>
          )}
          <button
            onClick={save}
            disabled={pending || hero.data.slides.length === 0}
            className="rounded-lg bg-[#558476] px-5 py-2 text-sm font-semibold text-white hover:bg-[#457366] disabled:opacity-50 transition-colors"
          >
            {pending ? 'Saving…' : 'Save hero'}
          </button>
        </div>
      </div>
    </div>
  )
}
