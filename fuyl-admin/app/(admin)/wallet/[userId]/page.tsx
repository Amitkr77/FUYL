import { getWalletBalance, getWalletTransactions } from '@/lib/wallet'
import { WalletManager } from '@/components/wallet/WalletManager'
import { getCustomer } from '@/lib/customers'

export default async function WalletDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const { userId } = await params
  const requestedPage = Number((await searchParams).page ?? 1)
  const page = Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1
  const [balance, transactions, customer] = await Promise.all([
    getWalletBalance(userId),
    getWalletTransactions(userId, page),
    getCustomer(userId),
  ])

  if (!balance) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-2xl font-bold text-slate-900 mb-2">Wallet not found</p>
        <p className="text-slate-500 text-sm">No wallet exists for this customer yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{customer?.name ?? 'Customer'} Wallet</h2>
          <p className="text-sm text-slate-500">{customer?.email ?? 'Manage balance and transaction history'}</p>
        </div>
      </div>

      <WalletManager userId={userId} balance={balance} transactions={transactions.items} pagination={transactions.meta} />
    </div>
  )
}
