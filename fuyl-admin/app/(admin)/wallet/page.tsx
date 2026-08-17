import Link from 'next/link'
import { Search, ArrowRight, Users, X } from 'lucide-react'
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
  if (q?.trim() && q.trim().length >= 2) {
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
        <p className="text-sm text-slate-500 mt-0.5">Choose a customer below or quickly filter by name or email.</p>
      </div>

      <form action="/wallet" className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
        <div className="flex max-w-2xl gap-2">
          <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent"
          />
          </div>
          <button className="rounded-lg bg-[#558476] px-4 text-sm font-medium text-white hover:bg-[#457366]">Search</button>
          {q && <Link href="/wallet" className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm text-slate-600"><X className="h-4 w-4" /> Clear</Link>}
        </div>
      </form>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">{error}</div>
      )}

      {!error && q?.trim() && q.trim().length >= 2 && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-50">
          <div className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-700"><Users className="h-4 w-4 text-[#558476]" />{q ? `Results for “${q}”` : 'Recent customers'}</div>
          {results.length === 0 ? (
            <p className="px-5 py-10 text-center text-slate-400 text-sm">No customers matched &quot;{q}&quot;. Try a full email address or a shorter name.</p>
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
      {!error && (!q?.trim() || q.trim().length < 2) && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-500">
          Enter at least 2 characters of a customer name or email to find a wallet.
        </div>
      )}
    </div>
  )
}
