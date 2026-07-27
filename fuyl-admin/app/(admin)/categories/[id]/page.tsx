import { getAdminCategory, listAdminCategories } from '@/lib/categories'
import { CategoryForm } from '@/components/categories/CategoryForm'

export default async function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [category, allCategories] = await Promise.all([
    getAdminCategory(id),
    listAdminCategories().catch(() => []),
  ])

  if (!category) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-2xl font-bold text-slate-900 mb-2">Category not found</p>
        <p className="text-slate-500 text-sm">Category &quot;{id}&quot; does not exist.</p>
      </div>
    )
  }

  return <CategoryForm category={category} allCategories={allCategories} />
}
