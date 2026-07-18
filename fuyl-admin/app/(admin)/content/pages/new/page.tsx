'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, Eye, CheckCircle2, AlertCircle, Code } from 'lucide-react'
import { createPageAction } from '../../actions'

const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent'

export default function NewContentPagePage() {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [form, setForm] = useState({
    title: '', body: '', seoTitle: '', seoDescription: '', status: 'draft' as 'draft' | 'published',
  })

  const slug = form.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 60)
  const set = (k: Partial<typeof form>) => setForm((f) => ({ ...f, ...k }))

  const handleSave = (publish = false) => {
    setError('')
    const input = { ...form, status: publish ? ('published' as const) : form.status }
    startTransition(async () => {
      const result = await createPageAction(input)
      if (result?.error) { setError(result.error); return }
      setSaved(true)
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/content" className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-slate-900">New Page</h2>
            <p className="text-sm text-slate-500">Fill in the details and save or publish</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleSave(false)} disabled={isPending} className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50">
            <Save className="w-4 h-4" />
            Save Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {saved ? 'Published!' : 'Publish'}
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
              <input
                type="text" value={form.title} onChange={(e) => set({ title: e.target.value })}
                placeholder="e.g. Shipping Policy"
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent"
              />
              {slug && (
                <p className="text-xs text-slate-400 mt-1.5">
                  Slug: <span className="font-mono text-slate-600">/pages/{slug}</span> (assigned by the server on save)
                </p>
              )}
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
                <textarea
                  value={form.body} onChange={(e) => set({ body: e.target.value })} rows={18}
                  placeholder={`Write the page content...\n\nPlain text or HTML both work (<p>, <h2>, <strong>, <a>, <ul>...) — it's rendered as-is on the storefront.`}
                  className={`${inputCls} resize-none font-mono text-sm leading-relaxed`}
                />
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
              <input type="text" value={form.seoTitle} onChange={(e) => set({ seoTitle: e.target.value })} className={inputCls} placeholder={form.title || 'Defaults to page title'} />
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
