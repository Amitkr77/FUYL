import { getOurStorySection } from '@/lib/content'
import { OurStorySectionForm } from '@/components/content/OurStorySectionForm'

export default async function OurStoryAdminPage() {
  const section = await getOurStorySection()
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Our Story Page</h2>
        <p className="text-sm text-slate-500 mt-0.5">Edit founder bios, images, milestones and CTA</p>
      </div>
      <OurStorySectionForm initial={section} />
    </div>
  )
}
