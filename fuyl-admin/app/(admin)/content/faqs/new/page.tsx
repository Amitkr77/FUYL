'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, CheckCircle2, AlertCircle } from 'lucide-react'
import { createFAQAction } from '../../actions'

const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent'

export default function NewFAQPage() {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ question: '', answer: '', isActive: true })

  const set = (k: Partial<typeof form>) => setForm((f) => ({ ...f, ...k }))

  const handleSave = () => {
    setError('')
    startTransition(async () => {
      const result = await createFAQAction(form)
      if (result?.error) { setError(result.error); return }
      setSaved(true)
    })
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/content?tab=faqs" className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-slate-900">New FAQ</h2>
            <p className="text-sm text-slate-500">Shown on the storefront&apos;s homepage</p>
          </div>
        </div>
        <button onClick={handleSave} disabled={isPending} className="flex items-center gap-2 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
          {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Saved!' : 'Save'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Question</label>
          <input type="text" value={form.question} onChange={(e) => set({ question: e.target.value })} maxLength={300} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Answer</label>
          <textarea value={form.answer} onChange={(e) => set({ answer: e.target.value })} rows={6} maxLength={2000} className={`${inputCls} resize-none`} />
          <p className="text-xs text-slate-400 mt-1.5">{form.answer.length}/2000</p>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700 pt-2 border-t border-slate-100">
          <input type="checkbox" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} className="rounded border-slate-300 text-[#558476] focus:ring-[#558476]" />
          Active (visible on storefront)
        </label>
      </div>
    </div>
  )
}
