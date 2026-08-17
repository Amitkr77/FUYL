import Link from 'next/link'
import { Search, AlertCircle, Info, Users, X } from 'lucide-react'
import { LoyaltyConfigForm } from '@/components/loyalty/LoyaltyConfigForm'
import { LoyaltyAdjustPanel } from '@/components/loyalty/LoyaltyAdjustPanel'
import { getActiveLoyaltyConfig, getLoyaltyTransactions, getLoyaltyAccount } from '@/lib/loyalty'
import { searchCustomers } from '@/lib/wallet'
import { getErrorMessage } from '@/lib/api'

const TABS = [
  { id: 'config',    label: 'Configuration' },
  { id: 'accounts',  label: 'Customer Accounts' },
]

export default async function LoyaltyPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string; userId?: string; userName?: string }>
}) {
  const { tab = 'config', q, userId, userName } = await searchParams

  let config: Awaited<ReturnType<typeof getActiveLoyaltyConfig>> = null
  let configError = ''
  try {
    config = await getActiveLoyaltyConfig()
  } catch (err) {
    configError = getErrorMessage(err, 'Could not load loyalty config.')
  }

  let customerResults: Awaited<ReturnType<typeof searchCustomers>> = []
  let transactions: Awaited<ReturnType<typeof getLoyaltyTransactions>> = { items: [], total: 0 }
  let account: Awaited<ReturnType<typeof getLoyaltyAccount>> | null = null
  let dataError = ''

  if (tab === 'accounts') {
    try {
      if (!userId && q?.trim() && q.trim().length >= 2) customerResults = await searchCustomers(q)
      if (userId) [transactions, account] = await Promise.all([getLoyaltyTransactions(userId), getLoyaltyAccount(userId)])
    } catch (err) {
      dataError = getErrorMessage(err, 'Could not load account data.')
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Loyalty Points</h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure the earn / redeem programme and manage customer point balances.
          </p>
        </div>
        {config && (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${config.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {config.isActive ? 'Programme active' : 'Programme inactive'}
          </span>
        )}
      </div>

      {/* Quick summary of active rates */}
      {config && (
        <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-500" />
          <p>
            <strong>Earn:</strong> ₹{config.earnSpend} → {config.earnPoints} pts
            &nbsp;·&nbsp;
            <strong>Redeem:</strong> {config.redeemPoints} pts → ₹{config.redeemValue}
            &nbsp;·&nbsp;
            <strong>Min to redeem:</strong> {config.minRedeemPoints} pts
            {config.pointExpiryDays > 0 && (
              <>&nbsp;·&nbsp;<strong>Expiry:</strong> {config.pointExpiryDays} days</>
            )}
          </p>
        </div>
      )}

      {/* Tab bar */}
      <nav className="flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/loyalty?tab=${t.id}`}
            className={`border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'border-[#558476] text-[#315f52]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {configError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {configError}
        </div>
      )}

      {/* ── Config tab ──────────────────────────────────────────── */}
      {tab === 'config' && <LoyaltyConfigForm config={config} />}

      {/* ── Accounts tab ────────────────────────────────────────── */}
      {tab === 'accounts' && (
        <div className="space-y-5">
          {/* Customer search form */}
          <form action="/loyalty" className="bg-white border border-slate-200 rounded-xl shadow-sm p-4">
            <input type="hidden" name="tab" value="accounts" />
            <div className="flex max-w-2xl gap-2">
              <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                name="q"
                defaultValue={q ?? ''}
                placeholder="Search customers by name or email…"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#558476] focus:border-transparent"
              />
              </div>
              <button className="rounded-lg bg-[#558476] px-4 text-sm font-medium text-white hover:bg-[#457366]">Search</button>
              {q && <Link href="/loyalty?tab=accounts" className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm text-slate-600"><X className="h-4 w-4" /> Clear</Link>}
            </div>
          </form>

          {dataError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {dataError}
            </div>
          )}

          {/* Search results — list of matching customers to click */}
          {!userId && !dataError && q?.trim() && q.trim().length >= 2 && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm divide-y divide-slate-50">
              <div className="flex items-center gap-2 px-5 py-3 text-sm font-semibold text-slate-700"><Users className="h-4 w-4 text-[#558476]" />{q ? `Results for “${q}”` : 'Recent customers'}</div>
              {customerResults.length === 0 ? (
                <p className="px-5 py-10 text-center text-slate-400 text-sm">
                  No customers matched &quot;{q}&quot;.
                </p>
              ) : (
                customerResults.map((c) => (
                  <Link
                    key={c.id}
                    href={`/loyalty?tab=accounts&userId=${c.id}&userName=${encodeURIComponent(c.name)}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">{c.name}</p>
                      <p className="text-sm text-slate-500">{c.email}</p>
                    </div>
                    <span className="text-xs text-slate-400">View points →</span>
                  </Link>
                ))
              )}
            </div>
          )}
          {!userId && !dataError && (!q?.trim() || q.trim().length < 2) && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center text-sm text-slate-500">
              Enter at least 2 characters of a customer name or email to manage loyalty points.
            </div>
          )}

          {/* Per-user panel — balance + history + adjust */}
          {userId && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Link
                  href="/loyalty?tab=accounts"
                  className="text-sm text-[#558476] hover:underline"
                >
                  ← Back to search
                </Link>
                {userName && (
                  <span className="text-sm font-semibold text-slate-900">
                    {decodeURIComponent(userName)}
                  </span>
                )}
              </div>
              {account && <LoyaltyAdjustPanel userId={userId} account={account} transactions={transactions.items} />}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
