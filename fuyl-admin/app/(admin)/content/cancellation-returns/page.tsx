import { getCancellationReturnsSection } from '@/lib/content'
import { LegalPageForm } from '@/components/content/LegalPageForm'
import { updateCancellationReturnsAction } from '../actions'

export default async function CancellationReturnsAdminPage() {
  const section = await getCancellationReturnsSection()
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Cancellation &amp; Returns</h2>
        <p className="text-sm text-slate-500 mt-0.5">Edit sections, last updated date and subtitle</p>
      </div>
      <LegalPageForm initial={section} saveAction={updateCancellationReturnsAction} />
    </div>
  )
}
