import { AlertCircle, CreditCard, CheckCircle2, XCircle, RefreshCcw, IndianRupee } from 'lucide-react'
import { PaymentsTable } from '@/components/payments/PaymentsTable'
import { listPayments, getPaymentStats } from '@/lib/payments'
import { getErrorMessage } from '@/lib/api'
import { CsvExportButton } from '@/components/ui/CsvExportButton'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)
}

export default async function PaymentsPage() {
  let payments: Awaited<ReturnType<typeof listPayments>> = []
  let stats = { totalPayments: 0, successCount: 0, failedCount: 0, refundedCount: 0, totalAmount: 0 }
  let error = ''

  try {
    ;[payments, stats] = await Promise.all([listPayments(), getPaymentStats()])
  } catch (err) {
    error = getErrorMessage(err, 'Could not load payments.')
  }

  const pendingCount = payments.filter((p) => p.status === 'pending').length

  const summaryCards = [
    {
      label: 'Total Collected',
      value: formatCurrency(stats.totalAmount),
      sub:   `${stats.totalPayments} transaction${stats.totalPayments !== 1 ? 's' : ''}`,
      Icon:  IndianRupee,
      color: 'text-[#558476]',
      bg:    'bg-[#558476]/10',
    },
    {
      label: 'Successful',
      value: stats.successCount,
      sub:   'Payments captured',
      Icon:  CheckCircle2,
      color: 'text-emerald-600',
      bg:    'bg-emerald-50',
    },
    {
      label: 'Failed',
      value: stats.failedCount,
      sub:   'Did not complete',
      Icon:  XCircle,
      color: 'text-rose-500',
      bg:    'bg-rose-50',
    },
    {
      label: 'Refunded',
      value: stats.refundedCount,
      sub:   pendingCount > 0 ? `${pendingCount} pending` : 'No pending payments',
      Icon:  RefreshCcw,
      color: 'text-amber-600',
      bg:    'bg-amber-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3"><div>
        <h2 className="text-xl font-bold text-slate-900">Payments</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Monitor transactions, track payment status, and process refunds
        </p>
      </div><CsvExportButton filename="payments" columns={[{key:'paymentNumber',label:'Payment number'},{key:'orderId',label:'Order ID'},{key:'amount',label:'Amount'},{key:'method',label:'Method'},{key:'gateway',label:'Gateway'},{key:'status',label:'Status'},{key:'attemptedAt',label:'Attempted at'},{key:'capturedAt',label:'Captured at'},{key:'refundedAmount',label:'Refunded amount'}]} rows={payments} /></div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map(({ label, value, sub, Icon, color, bg }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xl font-bold text-slate-800 leading-none truncate">{value}</p>
                <p className="text-xs text-slate-400 mt-1 leading-snug">{label}</p>
                <p className="text-xs text-slate-300 mt-0.5">{sub}</p>
              </div>
              <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-[18px] h-[18px] ${color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <PaymentsTable payments={payments} />
    </div>
  )
}
