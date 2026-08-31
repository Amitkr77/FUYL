import Link from 'next/link'
import { Plus, AlertCircle, Star, Image, ExternalLink, Search, ListTree, SearchCheck } from 'lucide-react'
import { ReorderButtons } from '@/components/content/ReorderButtons'
import Badge from '@/components/ui/Badge'
import { getErrorMessage } from '@/lib/api'
import {
  listAdminPages, listAdminIngredients, listAdminTestimonials, listAdminFAQs,
  type CMSPageSummary, type IngredientRecord, type TestimonialRecord, type FAQRecord,
} from '@/lib/content'
import { deletePageAction, duplicatePageAction, deleteIngredientAction, deleteTestimonialAction, deleteFAQAction } from './actions'
import { formatDate } from '@/lib/utils'
import { ContentRowActions } from '@/components/content/ContentRowActions'

type Tab = 'pages' | 'ingredients' | 'testimonials' | 'faqs'
const TABS: { label: string; value: Tab }[] = [
  { label: 'Pages', value: 'pages' },
  { label: 'Ingredients', value: 'ingredients' },
  { label: 'Testimonials', value: 'testimonials' },
  { label: 'FAQs', value: 'faqs' },
]

async function safeList<T>(fn: () => Promise<T[]>): Promise<{ items: T[]; error: string }> {
  try {
    return { items: await fn(), error: '' }
  } catch (err) {
    return { items: [], error: getErrorMessage(err, 'Could not load.') }
  }
}

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string; q?: string; status?: string; navigation?: string; sort?: string }>
}) {
  const query = await searchParams
  const { tab: rawTab, page: rawPage } = query
  const tab: Tab = (['pages', 'ingredients', 'testimonials', 'faqs'] as const).includes(rawTab as Tab)
    ? (rawTab as Tab)
    : 'pages'

  const pageNumber = Math.max(1, Number.parseInt(rawPage ?? '1', 10) || 1)
  const [pagesResult, ingredients, testimonials, faqs] = await Promise.all([
    listAdminPages({ page: pageNumber, search: query.q, status: query.status as 'draft' | 'published' | 'all' | undefined, navigation: query.navigation as 'none' | 'header' | 'footer' | 'both' | 'all' | undefined, sort: query.sort as 'updated_desc' | 'updated_asc' | 'title_asc' | 'title_desc' | 'navigation' | undefined }).then((value) => ({ ...value, error: '' })).catch((err) => ({ items: [] as CMSPageSummary[], meta: { page: pageNumber, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: pageNumber > 1 }, error: getErrorMessage(err, 'Could not load pages.') })),
    safeList(listAdminIngredients),
    safeList(listAdminTestimonials),
    safeList(listAdminFAQs),
  ])

  const counts: Record<Tab, number> = {
    pages: pagesResult.meta.total,
    ingredients: ingredients.items.length,
    testimonials: testimonials.items.length,
    faqs: faqs.items.length,
  }
  const newHref: Record<Tab, string> = {
    pages: '/content/pages/new',
    ingredients: '/content/ingredients/new',
    testimonials: '/content/testimonials/new',
    faqs: '/content/faqs/new',
  }
  const errors: Record<Tab, string> = {
    pages: pagesResult.error, ingredients: ingredients.error, testimonials: testimonials.error, faqs: faqs.error,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Website Content</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage pages, ingredients, testimonials & FAQs shown on the storefront</p>
        </div>
        <div className="flex items-center gap-2">
          {tab === 'pages' && <Link href="/content/quality" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"><SearchCheck className="h-4 w-4" />Content quality</Link>}
          {tab === 'pages' && <Link href="/content/navigation" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"><ListTree className="h-4 w-4" />Manage navigation</Link>}
          <Link
            href={newHref[tab]}
            className="flex items-center gap-2 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New {TABS.find((t) => t.value === tab)?.label.replace(/s$/, '')}
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Link href="/content/hero" className="block rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-[#558476]">
        <div className="flex items-center gap-4"><div className="rounded-xl bg-[#558476]/10 p-3 text-[#558476]"><Image className="h-6 w-6" /></div><div><h3 className="font-semibold text-slate-900">Homepage Hero Section</h3><p className="text-sm text-slate-500">Edit headings, subheadings, images, CTA buttons, slide visibility, and timing.</p></div></div>
      </Link>

      <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto scrollbar-hide">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/content?tab=${t.value}`}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px whitespace-nowrap ${
              tab === t.value
                ? 'text-[#558476] border-[#558476]'
                : 'text-slate-500 border-transparent hover:text-slate-700'
            }`}
          >
            {t.label} <span className="text-slate-400">({counts[t.value]})</span>
          </Link>
        ))}
      </div>

      {errors[tab] && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errors[tab]}
        </div>
      )}

      {tab === 'pages' && <><PageFilters values={query} /><PagesTable items={pagesResult.items} /><PagePagination page={pagesResult.meta.page} totalPages={pagesResult.meta.totalPages} total={pagesResult.meta.total} query={query} /></>}
      {tab === 'ingredients' && <IngredientsTable items={ingredients.items} />}
      {tab === 'testimonials' && <TestimonialsTable items={testimonials.items} />}
      {tab === 'faqs' && <FAQsTable items={faqs.items} />}
    </div>
  )
}

function PageFilters({ values }: { values: { q?: string; status?: string; navigation?: string; sort?: string } }) {
  return <form method="get" className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(220px,1fr)_160px_180px_180px_auto]">
    <input type="hidden" name="tab" value="pages" />
    <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input name="q" defaultValue={values.q} placeholder="Search title or URL…" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[#558476]" /></label>
    <select name="status" defaultValue={values.status ?? 'all'} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option></select>
    <select name="navigation" defaultValue={values.navigation ?? 'all'} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="all">All navigation</option><option value="header">Header</option><option value="footer">Footer</option><option value="both">Header & footer</option><option value="none">Direct URL only</option></select>
    <select name="sort" defaultValue={values.sort ?? 'updated_desc'} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"><option value="updated_desc">Recently updated</option><option value="updated_asc">Oldest updated</option><option value="title_asc">Title A–Z</option><option value="title_desc">Title Z–A</option><option value="navigation">Navigation order</option></select>
    <div className="flex gap-2"><button className="rounded-lg bg-[#558476] px-4 py-2 text-sm font-medium text-white">Apply</button><Link href="/content?tab=pages" className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">Reset</Link></div>
  </form>
}

function PagePagination({ page, totalPages, total, query }: { page: number; totalPages: number; total: number; query: Record<string, string | undefined> }) {
  if (totalPages <= 1) return null
  const href = (nextPage: number) => { const params = new URLSearchParams(); params.set('tab', 'pages'); params.set('page', String(nextPage)); for (const key of ['q', 'status', 'navigation', 'sort']) if (query[key]) params.set(key, query[key]!); return `/content?${params}` }
  return <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm"><span className="text-slate-500">Page {page} of {totalPages} · {total} pages</span><div className="flex gap-2">{page > 1 && <Link href={href(page - 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-50">Previous</Link>}{page < totalPages && <Link href={href(page + 1)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-slate-600 hover:bg-slate-50">Next</Link>}</div></div>
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr><td colSpan={colSpan} className="px-5 py-10 text-center text-slate-400 text-sm">{label}</td></tr>
  )
}

function PagesTable({ items }: { items: CMSPageSummary[] }) {
  const storefrontUrl = (process.env.STOREFRONT_URL ?? process.env.NEXT_PUBLIC_STOREFRONT_URL ?? 'https://fuyl.in').replace(/\/$/, '')

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Title</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Slug</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Navigation</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Last Updated</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.length === 0 ? <EmptyRow colSpan={6} label="No pages yet." /> : items.map((page) => (
              <tr key={page.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-4"><p className="text-sm font-medium text-slate-900">{page.title}</p>{page.status === 'published' && page.navigationPlacement === 'none' && <p className="mt-1 flex items-center gap-1 text-xs text-amber-600"><AlertCircle className="h-3 w-3" />Not linked in navigation</p>}</td>
                <td className="px-5 py-4 hidden md:table-cell">
                  {page.status === 'published' ? (
                    <a
                      href={`${storefrontUrl}/pages/${page.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-mono text-[#558476] hover:underline"
                      title="Open this page on the storefront"
                    >
                      /pages/{page.slug}<ExternalLink className="h-3 w-3" />
                    </a>
                  ) : <span className="text-xs font-mono text-slate-500">/pages/{page.slug}</span>}
                </td>
                <td className="px-5 py-4 hidden md:table-cell">
                  <span className="text-xs capitalize text-slate-600">
                    {page.navigationPlacement === 'none' ? 'Direct URL only' : page.navigationPlacement}
                  </span>
                </td>
                <td className="px-5 py-4 text-sm text-slate-500 hidden lg:table-cell">{formatDate(page.updatedAt)}</td>
                <td className="px-5 py-4">
                  <Badge variant={page.status === 'published' ? 'success' : 'default'}>
                    {page.status === 'published' ? 'Published' : 'Draft'}
                  </Badge>
                </td>
                <td className="px-5 py-4">
                  <ContentRowActions label="page" editHref={`/content/pages/${page.id}`} storefrontHref={page.status === 'published' ? `${storefrontUrl}/pages/${page.slug}` : undefined} duplicateAction={duplicatePageAction.bind(null, page.id)} deleteAction={deletePageAction.bind(null, page.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function IngredientsTable({ items }: { items: IngredientRecord[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Category</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Amount</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.length === 0 ? <EmptyRow colSpan={5} label="No ingredients yet." /> : items.map((ing,index) => (
              <tr key={ing.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-4">
                  <p className="text-sm font-medium text-slate-900">{ing.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5 max-w-xs truncate">{ing.benefit}</p>
                </td>
                <td className="px-5 py-4 hidden md:table-cell">
                  <span className="text-xs px-2 py-1 rounded-full bg-[#558476]/10 text-[#558476] font-medium capitalize">{ing.category}</span>
                </td>
                <td className="px-5 py-4 text-sm text-slate-500 hidden lg:table-cell">{ing.amount}</td>
                <td className="px-5 py-4">
                  <Badge variant={ing.isActive ? 'success' : 'default'}>{ing.isActive ? 'Active' : 'Inactive'}</Badge>
                </td>
                <td className="px-5 py-4">
                  <ReorderButtons id={ing.id} order={ing.order} type="ingredient" first={index===0} last={index===items.length-1} />
                  <ContentRowActions label="ingredient" editHref={`/content/ingredients/${ing.id}`} deleteAction={deleteIngredientAction.bind(null, ing.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function TestimonialsTable({ items }: { items: TestimonialRecord[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Type</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Rating</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.length === 0 ? <EmptyRow colSpan={5} label="No testimonials yet." /> : items.map((t,index) => (
              <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-4">
                  <p className="text-sm font-medium text-slate-900">{t.name}</p>
                  {t.title && <p className="text-xs text-slate-400 mt-0.5">{t.title}</p>}
                </td>
                <td className="px-5 py-4 hidden md:table-cell capitalize text-sm text-slate-500">{t.type}</td>
                <td className="px-5 py-4 hidden lg:table-cell">
                  {t.rating ? (
                    <div className="flex items-center gap-1 text-sm text-slate-700">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      {t.rating}
                    </div>
                  ) : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-5 py-4">
                  <Badge variant={t.isActive ? 'success' : 'default'}>{t.isActive ? 'Active' : 'Inactive'}</Badge>
                </td>
                <td className="px-5 py-4">
                  <ReorderButtons id={t.id} order={t.order} type="testimonial" first={index===0} last={index===items.length-1} />
                  <ContentRowActions label="testimonial" editHref={`/content/testimonials/${t.id}`} deleteAction={deleteTestimonialAction.bind(null, t.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FAQsTable({ items }: { items: FAQRecord[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Question</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.length === 0 ? <EmptyRow colSpan={3} label="No FAQs yet." /> : items.map((f) => (
              <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-4"><p className="text-sm font-medium text-slate-900 max-w-lg">{f.question}</p></td>
                <td className="px-5 py-4">
                  <Badge variant={f.isActive ? 'success' : 'default'}>{f.isActive ? 'Active' : 'Inactive'}</Badge>
                </td>
                <td className="px-5 py-4">
                  <ContentRowActions label="FAQ" editHref={`/content/faqs/${f.id}`} deleteAction={deleteFAQAction.bind(null, f.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
