import { AlertCircle } from 'lucide-react'
import { CustomersTable } from '@/components/customers/CustomersTable'
import { listCustomers } from '@/lib/customers'
import { getErrorMessage } from '@/lib/api'

export default async function CustomersPage() {
  let customers: Awaited<ReturnType<typeof listCustomers>> = []
  let error = ''
  try {
    customers = await listCustomers()
  } catch (err) {
    error = getErrorMessage(err, 'Could not load customers.')
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Customers</h2>
        <p className="text-sm text-slate-500 mt-0.5">{customers.length} registered customers</p>
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
