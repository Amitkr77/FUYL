import { getPrivacyPolicySection } from '@/lib/content'
import { LegalPageForm } from '@/components/content/LegalPageForm'
import { updatePrivacyPolicyAction } from '../actions'

export default async function PrivacyPolicyAdminPage() {
  const section = await getPrivacyPolicySection()
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Privacy Policy</h2>
        <p className="text-sm text-slate-500 mt-0.5">Edit sections, last updated date and subtitle</p>
      </div>
      <LegalPageForm initial={section} saveAction={updatePrivacyPolicyAction} />
    </div>
  )
}
