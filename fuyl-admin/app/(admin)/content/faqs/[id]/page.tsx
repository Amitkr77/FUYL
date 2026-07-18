import Link from 'next/link'
import { getAdminFAQ } from '@/lib/content'
import { EditFAQForm } from '@/components/content/EditFAQForm'

export default async function EditFAQPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const faq = await getAdminFAQ(id)

  if (!faq) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-2xl font-bold text-slate-900 mb-2">FAQ not found</p>
        <Link href="/content?tab=faqs" className="text-sm text-[#558476] hover:underline">← Back to Content</Link>
      </div>
    )
  }

  return <EditFAQForm faq={faq} />
}
