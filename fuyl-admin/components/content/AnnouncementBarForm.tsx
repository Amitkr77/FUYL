'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { updateAnnouncementBarAction } from '@/app/(admin)/content/actions'
import type { AnnouncementBarSection } from '@/lib/content'
import { useContentDraftGuard } from './useContentDraftGuard'
import { Input, Checkbox, Toggle } from '@/components/ui/form'

interface Props {
  initial: AnnouncementBarSection
}

export function AnnouncementBarForm({ initial }: Props) {
  const [data, setData] = useState(initial.data)
  const [isActive, setIsActive] = useState(initial.isActive)
  const [result, setResult] = useState<{ error?: string; ok?: true } | null>(null)
  const [pending, startTransition] = useTransition()
  const { dirty, markSaved } = useContentDraftGuard({ isActive, data })

  const save = () => {
    setResult(null)
    startTransition(async () => {
      const res = await updateAnnouncementBarAction({ isActive, data })
      setResult(res.error ? { error: res.error } : { ok: true })
      if (!res.error) markSaved({ isActive, data })
    })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-6">
      {/* Active toggle */}
      <Toggle
        checked={isActive}
        onChange={setIsActive}
        label="Show announcement bar on storefront"
      />

      <div className={`space-y-4 ${!isActive ? 'opacity-50 pointer-events-none' : ''}`}>
        <Input
          label="Bar text"
          value={String(data.text)}
          placeholder="e.g. FUYL COMPLETE+ LAUNCHING SOON"
          onChange={(e) => setData((d) => ({ ...d, text: e.target.value }))}
        />
        <Input
          label="Link URL"
          type="url"
          value={String(data.linkHref)}
          placeholder="e.g. /pages/contact"
          onChange={(e) => setData((d) => ({ ...d, linkHref: e.target.value }))}
        />
        <Input
          label="Link label (optional — leave blank to use bar text)"
          value={String(data.linkText)}
          placeholder="e.g. Learn more"
          onChange={(e) => setData((d) => ({ ...d, linkText: e.target.value }))}
        />

        <Checkbox
          label="Allow visitors to dismiss the bar"
          checked={data.dismissible}
          onChange={(e) => setData((d) => ({ ...d, dismissible: e.target.checked }))}
        />
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
        {pending ? 'Saving...' : 'Save changes'}
      </button>
    </div>
  )
}
