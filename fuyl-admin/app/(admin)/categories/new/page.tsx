import { listAdminCategories } from '@/lib/categories'
import { CategoryForm } from '@/components/categories/CategoryForm'

export default async function NewCategoryPage() {
  const allCategories = await listAdminCategories().catch(() => [])
  return <CategoryForm isNew allCategories={allCategories} />
}
