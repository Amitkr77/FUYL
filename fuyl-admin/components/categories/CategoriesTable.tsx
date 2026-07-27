'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Search, Edit2, Eye, EyeOff } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import type { AdminCategory } from '@/lib/categories'
import { setCategoryActiveAction } from '@/app/(admin)/categories/actions'

export function CategoriesTable({ categories }: { categories: AdminCategory[] }) {
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtered = categories.filter(
    (c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.slug.toLowerCase().includes(search.toLowerCase())
  )

  const toggleActive = (c: AdminCategory) => {
    setBusyId(c.id)
    startTransition(async () => {
      await setCategoryActiveAction(c.id, !c.isActive)
      setBusyId(null)
    })
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="p-4 border-b border-slate-100">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Slug</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Parent</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Sort</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">
                  {categories.length === 0 ? 'No categories yet — create your first one.' : 'No categories found.'}
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {c.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 bg-[#558476]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-[#558476] text-xs font-bold">{c.name.charAt(0)}</span>
                        </div>
                      )}
                      <span className="text-sm font-medium text-slate-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden md:table-cell font-mono">{c.slug}</td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden lg:table-cell">{c.parentName || '—'}</td>
                  <td className="px-5 py-4 text-sm text-slate-500 hidden lg:table-cell">{c.sortOrder}</td>
                  <td className="px-5 py-4">
                    <Badge variant={c.isActive ? 'success' : 'default'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/categories/${c.id}`}
                        className="p-1.5 text-slate-400 hover:text-[#558476] hover:bg-[#558476]/10 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => toggleActive(c)}
                        disabled={isPending && busyId === c.id}
                        className="p-1.5 text-slate-400 hover:text-[#558476] hover:bg-[#558476]/10 rounded-lg transition-colors disabled:opacity-50"
                        title={c.isActive ? 'Deactivate (hide from storefront)' : 'Activate'}
                      >
                        {c.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
