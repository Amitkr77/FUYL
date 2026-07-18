import Link from 'next/link'
import { getAdminTestimonial } from '@/lib/content'
import { EditTestimonialForm } from '@/components/content/EditTestimonialForm'

export default async function EditTestimonialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const testimonial = await getAdminTestimonial(id)

  if (!testimonial) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-2xl font-bold text-slate-900 mb-2">Testimonial not found</p>
        <Link href="/content?tab=testimonials" className="text-sm text-[#558476] hover:underline">← Back to Content</Link>
      </div>
    )
  }

  return <EditTestimonialForm testimonial={testimonial} />
}
