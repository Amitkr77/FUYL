import { AlertCircle, IndianRupee, Repeat2, UserRoundCheck, Users } from 'lucide-react'
import { CustomersTable } from '@/components/customers/CustomersTable'
import { listCustomers } from '@/lib/customers'
import { getErrorMessage } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

export default async function CustomersPage() {
  let customers: Awaited<ReturnType<typeof listCustomers>> = []
  let error = ''
  try {
    customers = await listCustomers()
  } catch (err) {
    error = getErrorMessage(err, 'Could not load customers.')
  }

  const totalRevenue = customers.reduce((sum, customer) => sum + customer.totalSpent, 0)
  const repeatCustomers = customers.filter((customer) => customer.orders > 1).length
  const purchasingCustomers = customers.filter((customer) => customer.orders > 0).length
  const stats = [
    { label: 'Total customers', value: String(customers.length), Icon: Users, color: 'text-slate-600', bg: 'bg-slate-100' },
    { label: 'Purchasing customers', value: String(purchasingCustomers), Icon: UserRoundCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Repeat customers', value: String(repeatCustomers), Icon: Repeat2, color: 'text-violet-600', bg: 'bg-violet-50' },
    { label: 'Customer revenue', value: formatCurrency(totalRevenue), Icon: IndianRupee, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Customers</h2>
        <p className="text-sm text-slate-500 mt-0.5">Understand customer activity, order history, and lifetime value</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {stats.map(({ label, value, Icon, color, bg }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex items-center gap-3 shadow-sm">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}><Icon className={`w-[18px] h-[18px] ${color}`} /></div>
            <div className="min-w-0"><p className="text-xl font-bold text-slate-800 leading-none truncate">{value}</p><p className="text-xs text-slate-400 mt-1">{label}</p></div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <CustomersTable customers={customers} />
    </div>
  )
}
