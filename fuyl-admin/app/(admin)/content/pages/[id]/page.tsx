import Link from 'next/link'
import { getAdminPage } from '@/lib/content'
import { EditPageForm } from '@/components/content/EditPageForm'

export default async function EditContentPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const page = await getAdminPage(id)

  if (!page) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-2xl font-bold text-slate-900 mb-2">Page not found</p>
        <Link href="/content" className="text-sm text-[#558476] hover:underline">← Back to Content</Link>
      </div>
    )
  }

  return <EditPageForm page={page} />
}
