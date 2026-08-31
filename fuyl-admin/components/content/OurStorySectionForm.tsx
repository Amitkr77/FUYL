'use client'

import { useRef, useState, useTransition } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, ImagePlus, CheckCircle2, AlertCircle } from 'lucide-react'
import type { OurStorySection, OurStoryFounder, OurStoryMilestone } from '@/lib/content'
import { updateOurStoryAction, getContentImageUploadSignature } from '@/app/(admin)/content/actions'
import { uploadImage } from '@/lib/upload'

const INPUT = 'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#558476] focus:ring-2 focus:ring-[#558476]/20'
const LABEL = 'mb-1.5 block text-xs font-semibold text-slate-700'

function FounderCard({
  founder,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  founder: OurStoryFounder
  index: number
  total: number
  onChange: (key: keyof OurStoryFounder, value: string) => void
  onRemove: () => void
  onMove: (dir: 'up' | 'down') => void
}) {
  const imgRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    setUploadError(''); setUploading(true)
    const res = await uploadImage(file, getContentImageUploadSignature)
    setUploading(false)
    if ('error' in res) { setUploadError(res.error); return }
    onChange('image', res.url)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <span className="text-sm font-semibold text-slate-700">Founder {index + 1}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMove('up')} disabled={index === 0} aria-label="Move up" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"><ChevronUp className="h-4 w-4" /></button>
          <button type="button" onClick={() => onMove('down')} disabled={index === total - 1} aria-label="Move down" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"><ChevronDown className="h-4 w-4" /></button>
          <button type="button" onClick={onRemove} disabled={total <= 1} className="ml-1 rounded p-1.5 text-red-400 hover:bg-red-50 disabled:opacity-30 transition-colors"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Image */}
        <div>
          <span className={LABEL}>Photo</span>
          <input ref={imgRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleImageUpload} />
          {founder.image ? (
            <div className="group relative h-32 w-32 rounded-lg border border-slate-200 overflow-hidden bg-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={founder.image} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button type="button" onClick={() => imgRef.current?.click()} disabled={uploading} className="rounded bg-white px-2.5 py-1 text-xs font-medium text-slate-700">{uploading ? 'Uploading…' : 'Replace'}</button>
                <button type="button" onClick={() => onChange('image', '')} className="rounded bg-white px-2.5 py-1 text-xs font-medium text-red-500">Remove</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => imgRef.current?.click()} disabled={uploading} className="flex h-32 w-32 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-200 text-sm text-slate-400 hover:border-[#558476] hover:text-[#558476] transition-colors disabled:opacity-60">
              <ImagePlus className="h-5 w-5" />
            </button>
          )}
          <input value={founder.image} onChange={(e) => onChange('image', e.target.value)} placeholder="Or paste image URL…" className={`mt-1.5 ${INPUT} text-xs`} />
          {uploadError && <p className="mt-1 flex items-center gap-1.5 text-xs text-red-600"><AlertCircle className="h-3.5 w-3.5" />{uploadError}</p>}
        </div>

        <label className="block">
          <span className={LABEL}>Name</span>
          <input value={founder.name} onChange={(e) => onChange('name', e.target.value)} placeholder="e.g. SWEEKAR SAXENA" className={INPUT} />
        </label>

        <label className="block">
          <span className={LABEL}>Bio <span className="font-normal text-slate-400">(HTML allowed — use &lt;strong&gt; for bold)</span></span>
          <textarea rows={8} value={founder.bio} onChange={(e) => onChange('bio', e.target.value)} className={`${INPUT} resize-y`} />
        </label>
      </div>
    </div>
  )
}

function MilestoneCard({
  milestone,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  milestone: OurStoryMilestone
  index: number
  total: number
  onChange: (key: keyof OurStoryMilestone, value: string) => void
  onRemove: () => void
  onMove: (dir: 'up' | 'down') => void
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <span className="text-sm font-semibold text-slate-700">Milestone {index + 1}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMove('up')} disabled={index === 0} aria-label="Move up" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"><ChevronUp className="h-4 w-4" /></button>
          <button type="button" onClick={() => onMove('down')} disabled={index === total - 1} aria-label="Move down" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"><ChevronDown className="h-4 w-4" /></button>
          <button type="button" onClick={onRemove} className="ml-1 rounded p-1.5 text-red-400 hover:bg-red-50 disabled:opacity-30 transition-colors"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <label className="block">
          <span className={LABEL}>Title</span>
          <input value={milestone.title} onChange={(e) => onChange('title', e.target.value)} placeholder="e.g. THE IDEA" className={INPUT} />
        </label>
        <label className="block">
          <span className={LABEL}>Body</span>
          <textarea rows={3} value={milestone.body} onChange={(e) => onChange('body', e.target.value)} className={`${INPUT} resize-y`} />
        </label>
      </div>
    </div>
  )
}

export function OurStorySectionForm({ initial }: { initial: OurStorySection }) {
  const [section, setSection] = useState(initial)
  const [result, setResult] = useState<{ error?: string; ok?: true } | null>(null)
  const [pending, startTransition] = useTransition()

  const setData = (patch: Partial<typeof section.data>) =>
    setSection((s) => ({ ...s, data: { ...s.data, ...patch } }))

  // Founders
  const updateFounder = (index: number, key: keyof OurStoryFounder, value: string) =>
    setData({ founders: section.data.founders.map((f, i) => i === index ? { ...f, [key]: value } : f) })
  const removeFounder = (index: number) =>
    setData({ founders: section.data.founders.filter((_, i) => i !== index) })
  const moveFounder = (index: number, dir: 'up' | 'down') => {
    const arr = [...section.data.founders]
    const target = dir === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]]
    setData({ founders: arr })
  }
  const addFounder = () =>
    setData({ founders: [...section.data.founders, { image: '', name: '', bio: '' }] })

  // Milestones
  const updateMilestone = (index: number, key: keyof OurStoryMilestone, value: string) =>
    setData({ milestones: section.data.milestones.map((m, i) => i === index ? { ...m, [key]: value } : m) })
  const removeMilestone = (index: number) =>
    setData({ milestones: section.data.milestones.filter((_, i) => i !== index) })
  const moveMilestone = (index: number, dir: 'up' | 'down') => {
    const arr = [...section.data.milestones]
    const target = dir === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]]
    setData({ milestones: arr })
  }
  const addMilestone = () =>
    setData({ milestones: [...section.data.milestones, { title: '', body: '' }] })

  const save = () => {
    setResult(null)
    startTransition(async () => {
      const res = await updateOurStoryAction(section)
      setResult(res.error ? { error: res.error } : { ok: true })
    })
  }

  return (
    <div className="space-y-6">
      {/* Settings card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
        <h3 className="text-sm font-semibold text-slate-900">Page settings</h3>

        {/* Active toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div className="relative">
            <input type="checkbox" className="sr-only peer" checked={section.isActive} onChange={(e) => setSection((s) => ({ ...s, isActive: e.target.checked }))} />
            <div className="h-5 w-9 rounded-full bg-slate-200 peer-checked:bg-[#558476] transition-colors" />
            <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
          </div>
          <span className="text-sm font-medium text-slate-700">Show this page on the storefront</span>
        </label>

        <label className="block">
          <span className={LABEL}>Hero quote</span>
          <textarea rows={3} value={section.data.heroQuote} onChange={(e) => setData({ heroQuote: e.target.value })} className={`${INPUT} resize-y`} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL}>CTA label</span>
            <input value={section.data.ctaLabel} onChange={(e) => setData({ ctaLabel: e.target.value })} placeholder="e.g. Try FUYL Complete+" className={INPUT} />
          </label>
          <label className="block">
            <span className={LABEL}>CTA link</span>
            <input value={section.data.ctaHref} onChange={(e) => setData({ ctaHref: e.target.value })} placeholder="/products/fuyl-complete" className={INPUT} />
          </label>
        </div>
      </div>

      {/* Founders */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Founders</h3>
          <button type="button" onClick={addFounder} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add founder
          </button>
        </div>
        {section.data.founders.map((founder, i) => (
          <FounderCard
            key={i}
            founder={founder}
            index={i}
            total={section.data.founders.length}
            onChange={(key, value) => updateFounder(i, key, value)}
            onRemove={() => removeFounder(i)}
            onMove={(dir) => moveFounder(i, dir)}
          />
        ))}
      </div>

      {/* Milestones */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Timeline milestones</h3>
          <button type="button" onClick={addMilestone} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add milestone
          </button>
        </div>
        {section.data.milestones.map((milestone, i) => (
          <MilestoneCard
            key={i}
            milestone={milestone}
            index={i}
            total={section.data.milestones.length}
            onChange={(key, value) => updateMilestone(i, key, value)}
            onRemove={() => removeMilestone(i)}
            onMove={(dir) => moveMilestone(i, dir)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {result?.error && (
          <span className="flex items-center gap-1.5 text-sm text-red-600"><AlertCircle className="h-4 w-4" />{result.error}</span>
        )}
        {result?.ok && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" />Saved successfully</span>
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
    </div>
  )
}
