import { notFound } from 'next/navigation'
import { PolicyForm } from '@/components/cashback/PolicyForm'
import { getCashbackPolicy } from '@/lib/cashback'

export default async function EditCashbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const policy = await getCashbackPolicy(id)
  if (!policy) notFound()
  return <div className="space-y-5"><div><h1 className="text-2xl font-bold text-slate-900">Edit cashback</h1><p className="text-sm text-slate-500">Update reward rules and eligibility.</p></div><PolicyForm policy={policy} /></div>
}
