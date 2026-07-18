import { AlertCircle } from 'lucide-react'
import { InventoryTable } from '@/components/inventory/InventoryTable'
import { listInventory } from '@/lib/inventory'
import { getErrorMessage } from '@/lib/api'

export default async function InventoryPage() {
  let stock: Awaited<ReturnType<typeof listInventory>> = []
  let error = ''
  try {
    stock = await listInventory()
  } catch (err) {
    error = getErrorMessage(err, 'Could not load inventory.')
  }

  const lowStockCount = stock.filter((s) => s.reorderThreshold > 0 && s.available <= s.reorderThreshold).length

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Inventory</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          {stock.length} stock records
          {lowStockCount > 0 && <span className="text-amber-600"> · {lowStockCount} low on stock</span>}
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <InventoryTable stock={stock} />
    </div>
  )
}
