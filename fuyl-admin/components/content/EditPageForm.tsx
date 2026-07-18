'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, CheckCircle2, Eye, Trash2, AlertCircle, Code } from 'lucide-react'
import type { CMSPageDetail } from '@/lib/content'
import { updatePageAction, deletePageAction } from '@/app/(admin)/content/actions'

const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent'

export function EditPageForm({ page }: { page: CMSPageDetail }) {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [form, setForm] = useState({
    title: page.title, body: page.body, seoTitle: page.seoTitle, seoDescription: page.seoDescription, status: page.status,
  })

  const set = (k: Partial<typeof form>) => setForm((f) => ({ ...f, ...k }))

  const save = (overrides: Partial<typeof form> = {}) => {
    setError('')
    const input = { ...form, ...overrides }
    if (Object.keys(overrides).length) set(overrides)
    startTransition(async () => {
      const result = await updatePageAction(page.id, input)
      if (result?.error) { setError(result.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const handleDelete = () => {
    startTransition(() => deletePageAction(page.id))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/content" className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Edit Page</h2>
            <p className="text-sm text-slate-500 truncate max-w-xs">/{page.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleDelete} disabled={isPending} className="flex items-center gap-2 px-4 py-2 border border-red-200 bg-white text-red-600 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50">
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          <button
            onClick={() => save({ status: form.status === 'published' ? 'draft' : 'published' })}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <Eye className="w-4 h-4" />
            {form.status === 'published' ? 'Unpublish' : 'Publish'}
          </button>
          <button onClick={() => save()} disabled={isPending} className="flex items-center gap-2 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Page Title</label>
              <input type="text" value={form.title} onChange={(e) => set({ title: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">Body</label>
                <button type="button" onClick={() => setShowPreview((v) => !v)} className="flex items-center gap-1.5 text-xs font-medium text-[#558476] hover:underline">
                  <Code className="w-3.5 h-3.5" />
                  {showPreview ? 'Edit HTML' : 'Preview rendered HTML'}
                </button>
              </div>
              {showPreview ? (
                <div
                  className="prose prose-sm max-w-none w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-slate-900 text-sm leading-relaxed min-h-[420px]"
                  dangerouslySetInnerHTML={{ __html: form.body || '<p class="text-slate-400">Nothing to preview yet.</p>' }}
                />
              ) : (
                <textarea value={form.body} onChange={(e) => set({ body: e.target.value })} rows={18}
                  placeholder="Write the page content here — plain text or HTML (<p>, <h2>, <strong>, <a>, <ul>...) both work."
                  className={`${inputCls} resize-none font-mono text-sm leading-relaxed`} />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Page Settings</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => set({ status: e.target.value as 'draft' | 'published' })} className={inputCls}>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">SEO</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">SEO Title</label>
              <input type="text" value={form.seoTitle} onChange={(e) => set({ seoTitle: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">SEO Description</label>
              <textarea value={form.seoDescription} onChange={(e) => set({ seoDescription: e.target.value })} rows={3} maxLength={300} className={`${inputCls} resize-none`} />
              <p className="text-xs text-slate-400 mt-1.5">{form.seoDescription.length}/300</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
