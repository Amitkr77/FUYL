'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react'
import type { LegalPageSection, LegalSection } from '@/lib/content'
import { useContentDraftGuard } from './useContentDraftGuard'
import { Input, Textarea, Checkbox, Toggle } from '@/components/ui/form'

interface Props {
  initial: LegalPageSection
  saveAction: (input: LegalPageSection) => Promise<{ error?: string }>
}

function SectionCard({
  section,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  section: LegalSection
  index: number
  total: number
  onChange: (key: keyof LegalSection, value: string | boolean) => void
  onRemove: () => void
  onMove: (dir: 'up' | 'down') => void
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
        <span className="text-sm font-semibold text-slate-700">Section {index + 1}</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMove('up')} disabled={index === 0} aria-label="Move up" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"><ChevronUp className="h-4 w-4" /></button>
          <button type="button" onClick={() => onMove('down')} disabled={index === total - 1} aria-label="Move down" className="rounded p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 transition-colors"><ChevronDown className="h-4 w-4" /></button>
          <button type="button" onClick={onRemove} className="ml-1 rounded p-1.5 text-red-400 hover:bg-red-50 transition-colors"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <Input label="Heading" value={section.heading} onChange={(e) => onChange('heading', e.target.value)} placeholder="e.g. Information We Collect" />

        <div>
          <Checkbox
            label="Render as bulleted list"
            checked={section.isList}
            onChange={(e) => onChange('isList', e.target.checked)}
          />
          <Textarea
            helperText={section.isList ? 'One bullet item per line' : 'Rendered as a paragraph'}
            rows={section.isList ? 6 : 4}
            value={section.body}
            onChange={(e) => onChange('body', e.target.value)}
            placeholder={section.isList ? 'First bullet item\nSecond bullet item\nThird bullet item' : 'Enter paragraph text\u2026'}
            className="mt-2"
          />
        </div>
      </div>
    </div>
  )
}

export function LegalPageForm({ initial, saveAction }: Props) {
  const [page, setPage] = useState(initial)
  const [result, setResult] = useState<{ error?: string; ok?: true } | null>(null)
  const [pending, startTransition] = useTransition()
  const { dirty, markSaved } = useContentDraftGuard(page)

  const setData = (patch: Partial<typeof page.data>) =>
    setPage((p) => ({ ...p, data: { ...p.data, ...patch } }))

  const updateSection = (index: number, key: keyof LegalSection, value: string | boolean) =>
    setData({ sections: page.data.sections.map((s, i) => i === index ? { ...s, [key]: value } : s) })

  const removeSection = (index: number) =>
    setData({ sections: page.data.sections.filter((_, i) => i !== index) })

  const moveSection = (index: number, dir: 'up' | 'down') => {
    const arr = [...page.data.sections]
    const target = dir === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= arr.length) return;
    [arr[index], arr[target]] = [arr[target], arr[index]]
    setData({ sections: arr })
  }

  const addSection = () =>
    setData({ sections: [...page.data.sections, { heading: '', body: '', isList: false }] })

  const save = () => {
    setResult(null)
    startTransition(async () => {
      const res = await saveAction(page)
      setResult(res.error ? { error: res.error } : { ok: true })
      if (!res.error) markSaved(page)
    })
  }

  return (
    <div className="space-y-6">
      {/* Page settings card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
        <h3 className="text-sm font-semibold text-slate-900">Page settings</h3>

        {/* Active toggle */}
        <Toggle
          checked={page.isActive}
          onChange={(v) => setPage((p) => ({ ...p, isActive: v }))}
          label="Show this page on the storefront"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Last updated" value={page.data.lastUpdated} onChange={(e) => setData({ lastUpdated: e.target.value })} placeholder="e.g. January 2025" />
          <Input label="Subtitle" value={page.data.subtitle} onChange={(e) => setData({ subtitle: e.target.value })} placeholder="Brief description shown below the title" className="sm:col-span-2" />
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Content sections</h3>
          <button type="button" onClick={addSection} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors">
            <Plus className="h-3.5 w-3.5" /> Add section
          </button>
        </div>
        {page.data.sections.map((section, i) => (
          <SectionCard
            key={i}
            section={section}
            index={i}
            total={page.data.sections.length}
            onChange={(key, value) => updateSection(i, key, value)}
            onRemove={() => removeSection(i)}
            onMove={(dir) => moveSection(i, dir)}
          />
        ))}
        {page.data.sections.length === 0 && (
          <div className="flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200 py-10 text-sm text-slate-400">
            No sections yet \u2014 click &ldquo;Add section&rdquo; to start
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {dirty && <span className="text-xs font-medium text-amber-600">Unsaved changes</span>}
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
          {pending ? 'Saving\u2026' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}
