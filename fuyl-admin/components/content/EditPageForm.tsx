'use client'

import { useEffect, useState, useTransition } from 'react'
import { Save, CheckCircle2, Eye, Trash2, AlertCircle } from 'lucide-react'
import type { CMSPageDetail, CMSPageRevision } from '@/lib/content'
import { updatePageAction, deletePageAction, createPagePreviewAction } from '@/app/(admin)/content/actions'
import { PageBodyEditor } from './PageBodyEditor'
import { SeoPreview } from './SeoPreview'
import { PageRevisionHistory } from './PageRevisionHistory'
import { useRouter } from 'next/navigation'

const inputCls = 'w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent'

export function EditPageForm({ page, storefrontUrl, revisions }: { page: CMSPageDetail; storefrontUrl: string; revisions: CMSPageRevision[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: page.title, body: page.body, seoTitle: page.seoTitle, seoDescription: page.seoDescription, status: page.status,
    navigationPlacement: page.navigationPlacement, navigationLabel: page.navigationLabel, navigationOrder: page.navigationOrder,
  })
  const [lastSaved, setLastSaved] = useState(JSON.stringify(form))
  const dirty = JSON.stringify(form) !== lastSaved
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault() }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [dirty])

  const set = (k: Partial<typeof form>) => setForm((f) => ({ ...f, ...k }))

  const save = (overrides: Partial<typeof form> = {}) => {
    setError('')
    const input = { ...form, ...overrides }
    if (Object.keys(overrides).length) set(overrides)
    startTransition(async () => {
      const result = await updatePageAction(page.id, input)
      if (result?.error) { setError(result.error); return }
      setLastSaved(JSON.stringify(input))
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2000)
    })
  }

  const handleDelete = () => {
    if (!window.confirm(`Delete “${page.title}”? This cannot be undone and its storefront URL will stop working.`)) return
    startTransition(() => deletePageAction(page.id))
  }
  const openStorefrontPreview = () => {
    const previewWindow = window.open('', '_blank')
    startTransition(async () => {
      if (dirty) {
        const savedResult = await updatePageAction(page.id, form)
        if (savedResult?.error) { previewWindow?.close(); setError(savedResult.error); return }
        setLastSaved(JSON.stringify(form))
        router.refresh()
      }
      const result = await createPagePreviewAction(page.id)
      if (result.error || !result.url) { previewWindow?.close(); setError(result.error ?? 'Could not create preview.'); return }
      if (previewWindow) previewWindow.location.href = result.url
      else window.open(result.url, '_blank', 'noopener,noreferrer')
    })
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Edit Page</h2>
            <p className="text-sm text-slate-500 truncate max-w-xs">/{page.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={openStorefrontPreview} disabled={isPending} className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"><Eye className="w-4 h-4" />Preview storefront</button>
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
          <button onClick={() => save()} disabled={isPending || !dirty} className="flex items-center gap-2 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saved ? 'Saved!' : isPending ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}
      {!error && <p className={`text-xs font-medium ${dirty ? 'text-amber-600' : 'text-emerald-600'}`}>{dirty ? 'You have unsaved changes.' : 'All changes are saved.'}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Page Title</label>
              <input type="text" value={form.title} onChange={(e) => set({ title: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-900 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent" />
            </div>
            <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Page content</label><PageBodyEditor value={form.body} onChange={(body) => set({ body })} /></div>
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Show page in</label>
              <select value={form.navigationPlacement} onChange={(e) => set({ navigationPlacement: e.target.value as typeof form.navigationPlacement })} className={inputCls}>
                <option value="none">Nowhere — direct URL only</option><option value="header">Website header</option><option value="footer">Website footer</option><option value="both">Header and footer</option>
              </select>
              <p className="text-xs text-slate-400 mt-1.5">Only published pages appear in storefront navigation.</p>
            </div>
            {form.navigationPlacement !== 'none' && <><div><label className="block text-sm font-medium text-slate-700 mb-1.5">Navigation label</label><input value={form.navigationLabel} onChange={(e) => set({ navigationLabel: e.target.value })} placeholder={form.title} className={inputCls} /></div><div><label className="block text-sm font-medium text-slate-700 mb-1.5">Navigation order</label><input type="number" min={0} value={form.navigationOrder} onChange={(e) => set({ navigationOrder: Number(e.target.value) })} className={inputCls} /></div></>}
            {form.status === 'published' && form.navigationPlacement === 'none' && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-700">This page is published but not linked in the website navigation. Customers can reach it only through its direct URL or another link.</p>}
            {form.status === 'published' && <a href={`${storefrontUrl}/pages/${page.slug}`} target="_blank" rel="noreferrer" className="inline-flex text-sm font-medium text-[#558476] hover:underline">View storefront page ↗</a>}
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
            <SeoPreview title={form.seoTitle || form.title} description={form.seoDescription} slug={page.slug} />
          </div>
          <PageRevisionHistory pageId={page.id} revisions={revisions} hasUnsavedChanges={dirty} />
        </div>
      </div>
    </div>
  )
}
