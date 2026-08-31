'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, Check, ExternalLink, GripVertical, Info, Save } from 'lucide-react'
import type { CMSPageSummary } from '@/lib/content'
import { updatePageNavigationAction } from '@/app/(admin)/content/actions'

type Placement = CMSPageSummary['navigationPlacement']

export function NavigationManager({ initialPages, storefrontUrl }: { initialPages: CMSPageSummary[]; storefrontUrl: string }) {
  const [pages, setPages] = useState(() => [...initialPages].sort((a, b) => a.navigationOrder - b.navigationOrder || a.title.localeCompare(b.title)))
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const linked = useMemo(() => pages.filter((page) => page.navigationPlacement !== 'none'), [pages])
  const unlinked = useMemo(() => pages.filter((page) => page.navigationPlacement === 'none'), [pages])

  const patch = (id: string, changes: Partial<CMSPageSummary>) => {
    setMessage(null)
    setPages((current) => current.map((page) => page.id === id ? { ...page, ...changes } : page))
  }
  const move = (id: string, direction: -1 | 1) => {
    setMessage(null)
    setPages((current) => {
      const index = current.findIndex((page) => page.id === id)
      const target = index + direction
      if (index < 0 || target < 0 || target >= current.length) return current
      const next = [...current]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }
  const save = () => startTransition(async () => {
    setMessage(null)
    const result = await updatePageNavigationAction(pages.map((page, navigationOrder) => ({
      id: page.id,
      navigationPlacement: page.navigationPlacement,
      navigationLabel: page.navigationLabel,
      navigationOrder,
    })))
    setMessage(result.error ? { kind: 'error', text: result.error } : { kind: 'success', text: 'Navigation saved and storefront menus refreshed.' })
  })

  return <div className="space-y-5">
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
      <p className="flex items-center gap-2 font-medium"><Info className="h-4 w-4" />How this works</p>
      <p className="mt-1 text-blue-700">Only published pages are listed. Choose where each page appears, set its customer-facing label, arrange the order, then save once. “Both” adds the page to header and footer.</p>
    </div>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Published pages</h2>
          <p className="mt-1 text-sm text-slate-500">{linked.length} linked · {unlinked.length} available by direct URL only</p>
        </div>
        {pages.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">Publish a page before adding it to navigation.</div> :
          <div className="divide-y divide-slate-100">{pages.map((page, index) => <div key={page.id} className="grid gap-3 p-4 md:grid-cols-[72px_minmax(160px,1fr)_170px_minmax(160px,0.8fr)_36px] md:items-center">
            <div className="flex items-center gap-1 text-slate-400">
              <GripVertical className="h-4 w-4" />
              <button type="button" disabled={index === 0} onClick={() => move(page.id, -1)} title="Move up" className="rounded p-1 hover:bg-slate-100 disabled:opacity-20"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" disabled={index === pages.length - 1} onClick={() => move(page.id, 1)} title="Move down" className="rounded p-1 hover:bg-slate-100 disabled:opacity-20"><ArrowDown className="h-4 w-4" /></button>
            </div>
            <div className="min-w-0"><p className="truncate text-sm font-medium text-slate-900">{page.title}</p><p className="truncate text-xs text-slate-400">/pages/{page.slug}</p></div>
            <select aria-label={`Navigation placement for ${page.title}`} value={page.navigationPlacement} onChange={(event) => patch(page.id, { navigationPlacement: event.target.value as Placement })} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              <option value="none">Direct URL only</option><option value="header">Header</option><option value="footer">Footer</option><option value="both">Header & footer</option>
            </select>
            <input aria-label={`Navigation label for ${page.title}`} value={page.navigationLabel} onChange={(event) => patch(page.id, { navigationLabel: event.target.value })} placeholder={page.title} maxLength={80} disabled={page.navigationPlacement === 'none'} className="rounded-lg border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400" />
            <Link href={`${storefrontUrl}/pages/${page.slug}`} target="_blank" rel="noopener noreferrer" title="Open storefront page" className="rounded p-2 text-slate-400 hover:bg-slate-100 hover:text-[#558476]"><ExternalLink className="h-4 w-4" /></Link>
          </div>)}</div>}
      </section>

      <aside className="space-y-4">
        <MenuPreview title="Header preview" pages={pages.filter((page) => page.navigationPlacement === 'header' || page.navigationPlacement === 'both')} />
        <MenuPreview title="Footer preview" pages={pages.filter((page) => page.navigationPlacement === 'footer' || page.navigationPlacement === 'both')} />
      </aside>
    </div>

    <div className="sticky bottom-4 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur">
      <div aria-live="polite">{message && <p className={`flex items-center gap-2 text-sm ${message.kind === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>{message.kind === 'success' && <Check className="h-4 w-4" />}{message.text}</p>}</div>
      <button type="button" onClick={save} disabled={pending || pages.length === 0} className="flex shrink-0 items-center gap-2 rounded-lg bg-[#558476] px-4 py-2 text-sm font-medium text-white hover:bg-[#457366] disabled:opacity-50"><Save className="h-4 w-4" />{pending ? 'Saving…' : 'Save navigation'}</button>
    </div>
  </div>
}

function MenuPreview({ title, pages }: { title: string; pages: CMSPageSummary[] }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="text-sm font-semibold text-slate-900">{title}</h3>{pages.length ? <ol className="mt-3 space-y-2">{pages.map((page, index) => <li key={page.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"><span className="w-5 text-xs text-slate-400">{index + 1}</span><span className="truncate text-slate-700">{page.navigationLabel.trim() || page.title}</span></li>)}</ol> : <p className="mt-3 rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">No custom pages assigned</p>}</div>
}
