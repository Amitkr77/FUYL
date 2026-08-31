'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { updatePrebookingModalAction } from '@/app/(admin)/content/actions'
import type { PrebookingModalSection } from '@/lib/content'

interface Props {
  initial: PrebookingModalSection
}

export function PrebookingModalForm({ initial }: Props) {
  const [data, setData] = useState(initial.data)
  const [isActive, setIsActive] = useState(initial.isActive)
  const [result, setResult] = useState<{ error?: string; ok?: true } | null>(null)
  const [pending, startTransition] = useTransition()

  const save = () => {
    setResult(null)
    startTransition(async () => {
      const res = await updatePrebookingModalAction({ isActive, data })
      setResult(res.error ? { error: res.error } : { ok: true })
    })
  }

  const textField = (label: string, key: 'badge' | 'headline' | 'description', placeholder?: string) => (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</span>
      <input
        type="text"
        value={data[key]}
        placeholder={placeholder}
        onChange={(e) => setData((d) => ({ ...d, [key]: e.target.value }))}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#558476] focus:ring-2 focus:ring-[#558476]/20"
      />
    </label>
  )

  const numberField = (label: string, key: 'delayMs' | 'capacity', min: number, hint?: string) => (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">{label}</span>
      {hint && <span className="mb-1.5 block text-xs text-slate-400">{hint}</span>}
      <input
        type="number"
        min={min}
        value={data[key]}
        onChange={(e) => setData((d) => ({ ...d, [key]: Number(e.target.value) }))}
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
        <span className="text-sm font-medium text-slate-700">Show pre-booking popup on storefront</span>
      </label>

      <div className={`space-y-4 ${!isActive ? 'opacity-50 pointer-events-none' : ''}`}>
        {textField('Badge text', 'badge', 'e.g. Launching soon')}
        {textField('Headline', 'headline', 'e.g. BE FIRST IN LINE')}
        {textField('Description', 'description', 'e.g. Join the FUYL pre-booking list…')}
        <div className="grid grid-cols-2 gap-4">
          {numberField('Delay before popup (ms)', 'delayMs', 0, '900 = 0.9 seconds')}
          {numberField('Pre-booking capacity', 'capacity', 1)}
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
        onClick={save}
        disabled={pending}
        className="rounded-lg bg-[#558476] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#457366] disabled:opacity-60 transition-colors"
      >
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  )
}
