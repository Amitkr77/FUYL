import Link from 'next/link'
import { Plus, Edit2, Trash2, AlertCircle, Star } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import { getErrorMessage } from '@/lib/api'
import {
  listAdminPages, listAdminIngredients, listAdminTestimonials, listAdminFAQs,
  type CMSPageSummary, type IngredientRecord, type TestimonialRecord, type FAQRecord,
} from '@/lib/content'
import { deletePageAction, deleteIngredientAction, deleteTestimonialAction, deleteFAQAction } from './actions'
import { formatDate } from '@/lib/utils'

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
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: rawTab } = await searchParams
  const tab: Tab = (['pages', 'ingredients', 'testimonials', 'faqs'] as const).includes(rawTab as Tab)
    ? (rawTab as Tab)
    : 'pages'

  const [pages, ingredients, testimonials, faqs] = await Promise.all([
    safeList(listAdminPages),
    safeList(listAdminIngredients),
    safeList(listAdminTestimonials),
    safeList(listAdminFAQs),
  ])

  const counts: Record<Tab, number> = {
    pages: pages.items.length,
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
    pages: pages.error, ingredients: ingredients.error, testimonials: testimonials.error, faqs: faqs.error,
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Website Content</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage pages, ingredients, testimonials & FAQs shown on the storefront</p>
        </div>
        <Link
          href={newHref[tab]}
          className="flex items-center gap-2 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New {TABS.find((t) => t.value === tab)?.label.replace(/s$/, '')}
        </Link>
      </div>

      {/* Tabs */}
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

      {tab === 'pages' && <PagesTable items={pages.items} />}
      {tab === 'ingredients' && <IngredientsTable items={ingredients.items} />}
      {tab === 'testimonials' && <TestimonialsTable items={testimonials.items} />}
      {tab === 'faqs' && <FAQsTable items={faqs.items} />}
    </div>
  )
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr><td colSpan={colSpan} className="px-5 py-10 text-center text-slate-400 text-sm">{label}</td></tr>
  )
}

function PagesTable({ items }: { items: CMSPageSummary[] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Title</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Slug</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Last Updated</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {items.length === 0 ? <EmptyRow colSpan={5} label="No pages yet." /> : items.map((page) => (
              <tr key={page.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-5 py-4"><p className="text-sm font-medium text-slate-900">{page.title}</p></td>
                <td className="px-5 py-4 hidden md:table-cell"><span className="text-xs font-mono text-slate-500">/{page.slug}</span></td>
                <td className="px-5 py-4 text-sm text-slate-500 hidden md:table-cell">{formatDate(page.updatedAt)}</td>
                <td className="px-5 py-4">
                  <Badge variant={page.status === 'published' ? 'success' : 'default'}>
                    {page.status === 'published' ? 'Published' : 'Draft'}
                  </Badge>
                </td>
                <td className="px-5 py-4">
                  <RowActions editHref={`/content/pages/${page.id}`} deleteAction={deletePageAction.bind(null, page.id)} />
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
            {items.length === 0 ? <EmptyRow colSpan={5} label="No ingredients yet." /> : items.map((ing) => (
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
                  <RowActions editHref={`/content/ingredients/${ing.id}`} deleteAction={deleteIngredientAction.bind(null, ing.id)} />
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
            {items.length === 0 ? <EmptyRow colSpan={5} label="No testimonials yet." /> : items.map((t) => (
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
                  <RowActions editHref={`/content/testimonials/${t.id}`} deleteAction={deleteTestimonialAction.bind(null, t.id)} />
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
                  <RowActions editHref={`/content/faqs/${f.id}`} deleteAction={deleteFAQAction.bind(null, f.id)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RowActions({ editHref, deleteAction }: { editHref: string; deleteAction: () => Promise<void> }) {
  return (
    <div className="flex items-center gap-1">
      <Link href={editHref} className="p-1.5 text-slate-400 hover:text-[#558476] hover:bg-[#558476]/10 rounded-lg transition-colors" title="Edit">
        <Edit2 className="w-4 h-4" />
      </Link>
      <form action={deleteAction}>
        <button type="submit" className="p-1.5 text-slate-400 hover:text-[#B76E79] hover:bg-[#B76E79]/10 rounded-lg transition-colors" title="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </form>
    </div>
  )
}
