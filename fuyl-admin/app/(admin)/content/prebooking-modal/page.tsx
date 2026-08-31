import { PrebookingModalForm } from '@/components/content/PrebookingModalForm'
import { getPrebookingModal } from '@/lib/content'

export default async function Page() {
  const initial = await getPrebookingModal()
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Pre-booking Popup</h1>
        <p className="text-sm text-slate-500 mt-0.5">The modal that invites visitors to join the pre-booking waitlist.</p>
      </div>
      <PrebookingModalForm initial={initial} />
      <SectionHistoryPanel sectionKey="prebooking-modal" />
    </div>
  )
}
import { SectionHistoryPanel } from '@/components/content/SectionHistoryPanel'
