import Link from 'next/link'
import { getAdminIngredient } from '@/lib/content'
import { EditIngredientForm } from '@/components/content/EditIngredientForm'

export default async function EditIngredientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ingredient = await getAdminIngredient(id)

  if (!ingredient) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-2xl font-bold text-slate-900 mb-2">Ingredient not found</p>
        <Link href="/content?tab=ingredients" className="text-sm text-[#558476] hover:underline">← Back to Content</Link>
      </div>
    )
  }

  return <EditIngredientForm ingredient={ingredient} />
}
