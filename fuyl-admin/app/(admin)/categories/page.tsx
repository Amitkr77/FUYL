import Link from 'next/link'
import { Plus, AlertCircle } from 'lucide-react'
import { CategoriesTable } from '@/components/categories/CategoriesTable'
import { listAdminCategories } from '@/lib/categories'
import { getErrorMessage } from '@/lib/api'

export default async function CategoriesPage() {
  let categories: Awaited<ReturnType<typeof listAdminCategories>> = []
  let error = ''
  try {
    categories = await listAdminCategories()
  } catch (err) {
    error = getErrorMessage(err, 'Could not load categories.')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Categories</h2>
          <p className="text-sm text-slate-500 mt-0.5">{categories.length} total categories</p>
        </div>
        <Link
          href="/categories/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <CategoriesTable categories={categories} />
    </div>
  )
}
