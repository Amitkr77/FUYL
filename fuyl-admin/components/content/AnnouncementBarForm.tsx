'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { updateAnnouncementBarAction } from '@/app/(admin)/content/actions'
import type { AnnouncementBarSection } from '@/lib/content'

interface Props {
  initial: AnnouncementBarSection
}

export function AnnouncementBarForm({ initial }: Props) {
  const [data, setData] = useState(initial.data)
  const [isActive, setIsActive] = useState(initial.isActive)
  const [result, setResult] = useState<{ error?: string; ok?: true } | null>(null)
  const [pending, startTransition] = useTransition()

  const save = () => {
    setResult(null)
    startTransition(async () => {
      const res = await updateAnnouncementBarAction({ isActive, data })
      setResult(res.error ? { error: res.error } : { ok: true })
    })
  }

  const field = (label: string, key: keyof typeof data, type: 'text' | 'url' = 'text', placeholder?: string) => (
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
      {/* Active toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div className="relative">
          <input type="checkbox" className="sr-only peer" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          <div className="h-5 w-9 rounded-full bg-slate-200 peer-checked:bg-[#558476] transition-colors" />
          <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
        </div>
        <span className="text-sm font-medium text-slate-700">Show announcement bar on storefront</span>
      </label>

      <div className={`space-y-4 ${!isActive ? 'opacity-50 pointer-events-none' : ''}`}>
        {field('Bar text', 'text', 'text', 'e.g. FUYL COMPLETE+ LAUNCHING SOON')}
        {field('Link URL', 'linkHref', 'url', 'e.g. /pages/contact')}
        {field('Link label (optional — leave blank to use bar text)', 'linkText', 'text', 'e.g. Learn more')}

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={data.dismissible}
            onChange={(e) => setData((d) => ({ ...d, dismissible: e.target.checked }))}
            className="h-4 w-4 accent-[#558476] rounded"
          />
          <span className="text-sm text-slate-700">Allow visitors to dismiss the bar</span>
        </label>
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
        onClick={save}
        disabled={pending}
        className="rounded-lg bg-[#558476] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#457366] disabled:opacity-60 transition-colors"
      >
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  )
}
