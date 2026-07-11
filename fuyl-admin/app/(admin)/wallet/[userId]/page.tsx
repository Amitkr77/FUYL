import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getWalletBalance, getWalletTransactions } from '@/lib/wallet'
import { WalletManager } from '@/components/wallet/WalletManager'

export default async function WalletDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>
}) {
  const { userId } = await params
  const [balance, transactions] = await Promise.all([
    getWalletBalance(userId),
    getWalletTransactions(userId).catch(() => []),
  ])

  if (!balance) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-2xl font-bold text-slate-900 mb-2">Wallet not found</p>
        <p className="text-slate-500 text-sm">No wallet exists for this customer yet.</p>
        <Link href="/wallet" className="mt-4 text-sm text-[#558476] hover:underline">Back to search</Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/wallet" className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Customer Wallet</h2>
          <p className="text-sm text-slate-500">Manage balance and transaction history</p>
        </div>
      </div>

      <WalletManager userId={userId} balance={balance} transactions={transactions} />
    </div>
  )
}
