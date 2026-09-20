'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { updatePopupBannerAction } from '@/app/(admin)/content/actions'
import type { PopupBannerSection } from '@/lib/content'
import { useContentDraftGuard } from './useContentDraftGuard'
import { Input, Textarea, Select, Toggle } from '@/components/ui/form'

interface Props {
  initial: PopupBannerSection
}

const FREQUENCY_OPTIONS = [
  { value: 'always', label: 'Every page load' },
  { value: 'once_per_session', label: 'Once per browser session' },
  { value: 'once_ever', label: 'Once per device (never again)' },
]

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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
      <Toggle
        checked={isActive}
        onChange={setIsActive}
        label="Show popup banner on storefront"
      />

      <div className={`space-y-4 ${!isActive ? 'opacity-50 pointer-events-none' : ''}`}>
        <Input
          label="Title"
          value={String(data.title)}
          placeholder="e.g. Exclusive offer for you"
          onChange={(e) => setData((d) => ({ ...d, title: e.target.value }))}
        />

        <Textarea
          label="Body text"
          rows={3}
          value={data.body}
          placeholder="e.g. Get 10% off your first order when you sign up today."
          onChange={(e) => setData((d) => ({ ...d, body: e.target.value }))}
        />

        <Input
          label="Image URL (optional)"
          type="url"
          value={String(data.imageUrl)}
          placeholder="https://..."
          onChange={(e) => setData((d) => ({ ...d, imageUrl: e.target.value }))}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="CTA button label"
            value={String(data.ctaLabel)}
            placeholder="e.g. Shop now"
            onChange={(e) => setData((d) => ({ ...d, ctaLabel: e.target.value }))}
          />
          <Input
            label="CTA button link"
            type="url"
            value={String(data.ctaHref)}
            placeholder="e.g. /products/fuyl-complete"
            onChange={(e) => setData((d) => ({ ...d, ctaHref: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Delay before popup (ms)"
            helperText="2000 = 2 seconds"
            type="number"
            min={0}
            value={data.delayMs}
            onChange={(e) => setData((d) => ({ ...d, delayMs: Number(e.target.value) }))}
          />
          <Select
            label="Show frequency"
            value={data.frequency}
            onChange={(e) => setData((d) => ({ ...d, frequency: e.target.value as typeof d.frequency }))}
            options={FREQUENCY_OPTIONS}
          />
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
        {pending ? 'Saving\u2026' : 'Save changes'}
      </button>
    </div>
  )
}
