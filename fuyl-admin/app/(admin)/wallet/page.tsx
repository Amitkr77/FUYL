import Link from 'next/link'
import { Search, ArrowRight } from 'lucide-react'
import { searchCustomers } from '@/lib/wallet'
import { getErrorMessage } from '@/lib/api'

export default async function WalletSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  let results: Awaited<ReturnType<typeof searchCustomers>> = []
  let error = ''
  if (q) {
    try {
      results = await searchCustomers(q)
    } catch (err) {
      error = getErrorMessage(err, 'Search failed.')
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Wallet</h2>
        <p className="text-sm text-slate-500 mt-0.5">Search for a customer to view or manage their wallet.</p>
      </div>

      <form action="/wallet" className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent"
          />
        </div>
      </form>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>
      )}

      {q && !error && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-50">
          {results.length === 0 ? (
            <p className="px-5 py-10 text-center text-slate-400 text-sm">No customers matched &quot;{q}&quot;.</p>
          ) : (
            results.map((c) => (
              <Link
                key={c.id}
                href={`/wallet/${c.id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">{c.name}</p>
                  <p className="text-sm text-slate-500">{c.email}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  )
}
