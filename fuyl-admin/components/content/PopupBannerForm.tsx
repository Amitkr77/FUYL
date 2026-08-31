'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { updatePopupBannerAction } from '@/app/(admin)/content/actions'
import type { PopupBannerSection } from '@/lib/content'
import { useContentDraftGuard } from './useContentDraftGuard'

interface Props {
  initial: PopupBannerSection
}

export function PopupBannerForm({ initial }: Props) {
  const [data, setData] = useState(initial.data)
  const [isActive, setIsActive] = useState(initial.isActive)
  const [result, setResult] = useState<{ error?: string; ok?: true } | null>(null)
  const [pending, startTransition] = useTransition()
  const { dirty, markSaved } = useContentDraftGuard({ isActive, data })

  const save = () => {
    setResult(null)
    startTransition(async () => {
      const res = await updatePopupBannerAction({ isActive, data })
      setResult(res.error ? { error: res.error } : { ok: true })
      if (!res.error) markSaved({ isActive, data })
    })
  }

  const textField = (label: string, key: keyof typeof data, type: 'text' | 'url' = 'text', placeholder?: string) => (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</span>
      <input
        type={type}
        value={String(data[key])}
        placeholder={placeholder}
        onChange={(e) => setData((d) => ({ ...d, [key]: e.target.value }))}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#558476] focus:ring-2 focus:ring-[#558476]/20"
      />
    </label>
  )

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
      <label className="flex items-center gap-3 cursor-pointer">
        <div className="relative">
          <input type="checkbox" className="sr-only peer" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <div className="h-5 w-9 rounded-full bg-slate-200 peer-checked:bg-[#558476] transition-colors" />
          <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
        </div>
        <span className="text-sm font-medium text-slate-700">Show popup banner on storefront</span>
      </label>

      <div className={`space-y-4 ${!isActive ? 'opacity-50 pointer-events-none' : ''}`}>
        {textField('Title', 'title', 'text', 'e.g. Exclusive offer for you')}

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-700">Body text</span>
          <textarea
            rows={3}
            value={data.body}
            placeholder="e.g. Get 10% off your first order when you sign up today."
            onChange={(e) => setData((d) => ({ ...d, body: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#558476] focus:ring-2 focus:ring-[#558476]/20 resize-none"
          />
        </label>

        {textField('Image URL (optional)', 'imageUrl', 'url', 'https://...')}

        <div className="grid grid-cols-2 gap-4">
          {textField('CTA button label', 'ctaLabel', 'text', 'e.g. Shop now')}
          {textField('CTA button link', 'ctaHref', 'url', 'e.g. /products/fuyl-complete')}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">Delay before popup (ms)</span>
            <span className="mb-1.5 block text-xs text-slate-400">2000 = 2 seconds</span>
            <input
              type="number"
              min={0}
              value={data.delayMs}
              onChange={(e) => setData((d) => ({ ...d, delayMs: Number(e.target.value) }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#558476] focus:ring-2 focus:ring-[#558476]/20"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-700">Show frequency</span>
            <select
              value={data.frequency}
              onChange={(e) => setData((d) => ({ ...d, frequency: e.target.value as typeof d.frequency }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#558476] focus:ring-2 focus:ring-[#558476]/20"
            >
              <option value="always">Every page load</option>
              <option value="once_per_session">Once per browser session</option>
              <option value="once_ever">Once per device (never again)</option>
            </select>
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

        {dirty && <span className="text-xs font-medium text-amber-600">Unsaved changes</span>}
        <button
        onClick={save}
        disabled={pending}
        className="rounded-lg bg-[#558476] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#457366] disabled:opacity-60 transition-colors"
      >
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  )
}
