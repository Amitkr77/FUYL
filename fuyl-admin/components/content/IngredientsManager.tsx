'use client'

/* Ingredient thumbnails are remote CMS URLs and intentionally bypass Next image optimization. */
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Leaf, Plus, Search } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { ContentRowActions } from './ContentRowActions'
import { ReorderButtons } from './ReorderButtons'
import type { IngredientRecord } from '@/lib/content'
import { deleteIngredientAction } from '@/app/(admin)/content/actions'
import { INGREDIENT_CATEGORIES } from '@/lib/ingredientCategory'

type Visibility = 'all' | 'active' | 'inactive'

export function IngredientsManager({ items, storefrontUrl }: { items: IngredientRecord[]; storefrontUrl: string }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [visibility, setVisibility] = useState<Visibility>('all')

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return items.filter((item) => {
      const matchesQuery = !term || [item.name, item.benefit, item.amount].some((value) => value.toLowerCase().includes(term))
      const matchesCategory = category === 'all' || item.category === category
      const matchesVisibility = visibility === 'all' || (visibility === 'active' ? item.isActive : !item.isActive)
      return matchesQuery && matchesCategory && matchesVisibility
    })
  }, [category, items, query, visibility])

  const active = items.filter((item) => item.isActive).length
  const filtering = Boolean(query.trim()) || category !== 'all' || visibility !== 'all'

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Ingredients</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">Manage the ingredient records shown on the homepage and the full Ingredients page. Inactive records remain saved but are hidden from customers.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <a href={`${storefrontUrl}/pages/ingredients`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"><ExternalLink className="h-4 w-4" />View storefront</a>
        <Link href="/content/ingredients/new" className="inline-flex items-center gap-2 rounded-lg bg-[#558476] px-4 py-2 text-sm font-medium text-white hover:bg-[#457366]"><Plus className="h-4 w-4" />Add ingredient</Link>
      </div>
    </div>

    <div className="grid gap-3 sm:grid-cols-3">
      <Summary label="Total ingredients" value={items.length} />
      <Summary label="Visible on storefront" value={active} tone="green" />
      <Summary label="Hidden" value={items.length - active} tone="slate" />
    </div>

    {items.length === 0 ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
      <div className="flex gap-3"><Leaf className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div><h2 className="font-semibold text-amber-900">No managed ingredients have been created yet</h2><p className="mt-1 text-sm leading-6 text-amber-800">The storefront may still show legacy ingredients bundled in the website code. Those fallback records are not database content and therefore cannot appear here for editing. Add the ingredients here to make this admin section the source of truth.</p><Link href="/content/ingredients/new" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800"><Plus className="h-4 w-4" />Add first managed ingredient</Link></div></div>
    </div> : <>
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(220px,1fr)_220px_180px]">
        <label className="relative"><span className="sr-only">Search ingredients</span><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, benefit or amount" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#558476]" /></label>
        <select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">All categories</option>{INGREDIENT_CATEGORIES.map((item) => <option key={item} value={item} className="capitalize">{item}</option>)}</select>
        <select aria-label="Filter by visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="all">All visibility</option><option value="active">Visible</option><option value="inactive">Hidden</option></select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3 text-sm text-slate-500"><span>Showing <span className="font-semibold text-slate-800">{filtered.length}</span> of {items.length} ingredients</span>{filtering && <span className="text-xs text-amber-600">Clear filters to change display order.</span>}</div>
        <div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-slate-100 bg-slate-50/70"><th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Ingredient</th><th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:table-cell">Category</th><th className="hidden px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 lg:table-cell">Amount</th><th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Storefront</th><th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{filtered.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">No ingredients match these filters.</td></tr> : filtered.map((item, index) => <tr key={item.id} className="hover:bg-slate-50/60"><td className="px-5 py-4"><div className="flex items-center gap-3">{item.image ? <img src={item.image} alt="" className="h-11 w-11 rounded-lg border border-slate-200 object-cover" /> : <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><Leaf className="h-5 w-5" /></span>}<div className="min-w-0"><Link href={`/content/ingredients/${item.id}`} className="font-medium text-slate-900 hover:text-[#558476] hover:underline">{item.name}</Link><p className="mt-0.5 max-w-sm truncate text-xs text-slate-500">{item.benefit}</p></div></div></td><td className="hidden px-5 py-4 md:table-cell"><span className="rounded-full bg-[#558476]/10 px-2.5 py-1 text-xs font-medium capitalize text-[#558476]">{item.category}</span></td><td className="hidden px-5 py-4 text-sm text-slate-600 lg:table-cell">{item.amount}</td><td className="px-5 py-4"><Badge variant={item.isActive ? 'success' : 'default'}>{item.isActive ? 'Visible' : 'Hidden'}</Badge></td><td className="px-5 py-4"><div className="flex justify-end gap-1">{!filtering && <ReorderButtons id={item.id} order={item.order} type="ingredient" first={index === 0} last={index === filtered.length - 1} />}<ContentRowActions label="ingredient" editHref={`/content/ingredients/${item.id}`} deleteAction={deleteIngredientAction.bind(null, item.id)} /></div></td></tr>)}</tbody>
        </table></div>
      </div>
    </>}
  </div>
}

function Summary({ label, value, tone = 'brand' }: { label: string; value: number; tone?: 'brand' | 'green' | 'slate' }) {
  const colours = tone === 'green' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : tone === 'slate' ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-[#558476]/20 bg-[#558476]/5 text-[#385f54]'
  return <div className={`rounded-xl border p-4 ${colours}`}><p className="text-xs font-semibold uppercase tracking-wide opacity-75">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></div>
}
