'use client'

import { useEffect, useState, useTransition } from 'react'
import { Save, CheckCircle2, Eye, Trash2, AlertCircle } from 'lucide-react'
import type { CMSPageDetail, CMSPageRevision } from '@/lib/content'
import { updatePageAction, deletePageAction, createPagePreviewAction } from '@/app/(admin)/content/actions'
import { PageBodyEditor } from './PageBodyEditor'
import { SeoPreview } from './SeoPreview'
import { PageRevisionHistory } from './PageRevisionHistory'
import { useRouter } from 'next/navigation'
import { Input, Textarea, Select, FormSection } from '@/components/ui/form'

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
    if (!window.confirm(`Delete "${page.title}"? This cannot be undone and its storefront URL will stop working.`)) return
    startTransition(() => deletePageAction(page.id))
  }
  const openStorefrontPreview = () => {
    const previewWindow = window.open('', '_blank')
    startTransition(async () => {
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
          <button onClick={openStorefrontPreview} disabled={isPending} title={dirty ? 'Preview shows the last saved version. Save changes first to include current edits.' : 'Preview the saved page'} className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"><Eye className="w-4 h-4" />Preview saved page</button>
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
          <FormSection className="p-6">
            <Input
              label="Page Title"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
            />
            <div><label className="mb-1.5 block text-sm font-medium text-slate-700">Page content</label><PageBodyEditor value={form.body} onChange={(body) => set({ body })} /></div>
          </FormSection>
        </div>

        <div className="space-y-5">
          <FormSection title="Page Settings">
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => set({ status: e.target.value as 'draft' | 'published' })}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'published', label: 'Published' },
              ]}
            />
            <Select
              label="Show page in"
              value={form.navigationPlacement}
              onChange={(e) => set({ navigationPlacement: e.target.value as typeof form.navigationPlacement })}
              options={[
                { value: 'none', label: 'Nowhere — direct URL only' },
                { value: 'header', label: 'Website header' },
                { value: 'footer', label: 'Website footer' },
                { value: 'both', label: 'Header and footer' },
              ]}
              helperText="Only published pages appear in storefront navigation."
            />
            {form.navigationPlacement !== 'none' && <>
              <Input
                label="Navigation label"
                value={form.navigationLabel}
                onChange={(e) => set({ navigationLabel: e.target.value })}
                placeholder={form.title}
              />
              <Input
                type="number"
                label="Navigation order"
                min={0}
                value={form.navigationOrder}
                onChange={(e) => set({ navigationOrder: Number(e.target.value) })}
              />
            </>}
            {form.status === 'published' && form.navigationPlacement === 'none' && <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-700">This page is published but not linked in the website navigation. Customers can reach it only through its direct URL or another link.</p>}
            {form.status === 'published' && <a href={`${storefrontUrl}/pages/${page.slug}`} target="_blank" rel="noreferrer" className="inline-flex text-sm font-medium text-[#558476] hover:underline">View storefront page ↗</a>}
          </FormSection>

          <FormSection title="SEO">
            <Input
              label="SEO Title"
              type="text"
              value={form.seoTitle}
              onChange={(e) => set({ seoTitle: e.target.value })}
            />
            <Textarea
              label="SEO Description"
              value={form.seoDescription}
              onChange={(e) => set({ seoDescription: e.target.value })}
              rows={3}
              maxLength={300}
              helperText={`${form.seoDescription.length}/300`}
            />
            <SeoPreview title={form.seoTitle || form.title} description={form.seoDescription} slug={page.slug} />
          </FormSection>
          <PageRevisionHistory pageId={page.id} revisions={revisions} hasUnsavedChanges={dirty} />
        </div>
      </div>
    </div>
  )
}
