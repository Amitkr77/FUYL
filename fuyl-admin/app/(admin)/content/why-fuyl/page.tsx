import { getWhyFuylSection } from '@/lib/content'
import { WhyFuylSectionForm } from '@/components/content/WhyFuylSectionForm'

export default async function WhyFuylAdminPage() {
  const section = await getWhyFuylSection()
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Why FUYL Page</h2>
        <p className="text-sm text-slate-500 mt-0.5">Edit hero headline, description, image, CTAs and pillars headings</p>
      </div>
      <WhyFuylSectionForm initial={section} />
    </div>
  )
}
