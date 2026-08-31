'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Eye, CheckCircle2, AlertCircle } from 'lucide-react'
import { createPageAction } from '../../actions'
import { PageBodyEditor } from '@/components/content/PageBodyEditor'
import { SeoPreview } from '@/components/content/SeoPreview'
import { PAGE_TEMPLATES } from '@/lib/pageTemplates'

const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent'

export default function NewContentPagePage() {
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [template, setTemplate] = useState('blank')
  const router = useRouter()
  const [form, setForm] = useState({
    title: '', body: '', seoTitle: '', seoDescription: '', status: 'draft' as 'draft' | 'published', navigationPlacement: 'none' as 'none' | 'header' | 'footer' | 'both', navigationLabel: '', navigationOrder: 0,
  })

  const slug = form.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 60)
  const set = (k: Partial<typeof form>) => setForm((f) => ({ ...f, ...k }))
  const dirty = Boolean(form.title || form.body || form.seoTitle || form.seoDescription || form.navigationLabel || form.navigationOrder || form.status !== 'draft' || form.navigationPlacement !== 'none')
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault() }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [dirty])

  const handleSave = (publish = false) => {
    setError('')
    const input = { ...form, status: publish ? ('published' as const) : form.status }
    startTransition(async () => {
      const result = await createPageAction(input)
      if (result?.error) { setError(result.error); return }
      setSaved(true)
      if (result?.success && result.id) router.push(`/content/pages/${result.id}`)
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
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
            <div><div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3"><label className="min-w-0 flex-1 text-xs font-semibold text-slate-600">Start from a template<select value={template} onChange={(e) => setTemplate(e.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal">{PAGE_TEMPLATES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button type="button" onClick={() => { const selected = PAGE_TEMPLATES.find((item) => item.id === template); if (!selected || (form.body && !window.confirm('Replace the current page content with this template?'))) return; set({ body: selected.body }) }} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600">Apply template</button></div><label className="mb-1.5 block text-sm font-medium text-slate-700">Page content</label><PageBodyEditor value={form.body} onChange={(body) => set({ body })} /></div>
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
            <div><label className="block text-sm font-medium text-slate-700 mb-1.5">Show page in</label><select value={form.navigationPlacement} onChange={(e) => set({ navigationPlacement: e.target.value as typeof form.navigationPlacement })} className={inputCls}><option value="none">Nowhere — direct URL only</option><option value="header">Website header</option><option value="footer">Website footer</option><option value="both">Header and footer</option></select><p className="text-xs text-slate-400 mt-1.5">Publishing makes the page accessible. Choose a navigation location so customers can discover it.</p></div>
            {form.navigationPlacement !== 'none' && <><div><label className="block text-sm font-medium text-slate-700 mb-1.5">Navigation label</label><input value={form.navigationLabel} onChange={(e) => set({ navigationLabel: e.target.value })} placeholder={form.title || 'Menu label'} className={inputCls} /></div><div><label className="block text-sm font-medium text-slate-700 mb-1.5">Navigation order</label><input type="number" min={0} value={form.navigationOrder} onChange={(e) => set({ navigationOrder: Number(e.target.value) })} className={inputCls} /></div></>}
            {form.status === 'published' && form.navigationPlacement === 'none' && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-700">This page will be public but accessible only through its direct URL unless another page links to it.</p>}
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
            <SeoPreview title={form.seoTitle || form.title} description={form.seoDescription} slug={slug} />
          </div>
        </div>
      </div>
    </div>
  )
}
