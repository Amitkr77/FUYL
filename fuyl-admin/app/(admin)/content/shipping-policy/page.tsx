import { getShippingPolicySection } from '@/lib/content'
import { LegalPageForm } from '@/components/content/LegalPageForm'
import { updateShippingPolicyAction } from '../actions'

export default async function ShippingPolicyAdminPage() {
  const section = await getShippingPolicySection()
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Shipping Policy</h2>
        <p className="text-sm text-slate-500 mt-0.5">Edit sections, last updated date and subtitle</p>
      </div>
      <LegalPageForm initial={section} saveAction={updateShippingPolicyAction} />
    </div>
  )
}
