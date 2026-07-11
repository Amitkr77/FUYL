import { CampaignForm } from '@/components/promotions/CampaignForm'

export default function NewCampaignPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">New Campaign</h2>
        <p className="text-sm text-slate-500 mt-0.5">Create a coupon campaign or promotional rule.</p>
      </div>
      <CampaignForm />
    </div>
  )
}
