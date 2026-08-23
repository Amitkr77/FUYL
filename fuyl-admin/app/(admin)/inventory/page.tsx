import { AlertCircle, Boxes, AlertTriangle, PackageX, PackageCheck, TrendingDown } from 'lucide-react'
import { InventoryTable } from '@/components/inventory/InventoryTable'
import { LocationManager } from '@/components/inventory/LocationManager'
import { listInventory, getConsumptionStats, listLocations } from '@/lib/inventory'
import { getErrorMessage } from '@/lib/api'
import { CsvExportButton } from '@/components/ui/CsvExportButton'
import { ActivityFeed } from '@/components/ui/ActivityFeed'
import { getAuditLogs, type AuditLogEntry } from '@/lib/auditLog'

export default async function InventoryPage() {
  let stock: Awaited<ReturnType<typeof listInventory>> = []
  let consumption: Awaited<ReturnType<typeof getConsumptionStats>> | null = null
  let locations: Awaited<ReturnType<typeof listLocations>> = []
  let auditLogs: AuditLogEntry[] = []
  let error = ''
  try {
    ;[stock, consumption, locations, auditLogs] = await Promise.all([
      listInventory(),
      getConsumptionStats(30),
      listLocations(),
      getAuditLogs({ section: 'inventory', limit: 20 }).catch(() => []),
    ])
  } catch (err) {
    error = getErrorMessage(err, 'Could not load inventory.')
    try { stock = await listInventory() } catch { /* ignore */ }
  }

  // Unique products (a product with 3 variants creates 3 rows)
  const productCount   = new Set(stock.map((s) => s.productId)).size
  const inStockCount   = stock.filter((s) => s.available > 0).length
  const lowStockCount  = stock.filter((s) => s.reorderThreshold > 0 && s.available > 0 && s.available <= s.reorderThreshold).length
  const outOfStockCount = stock.filter((s) => s.available === 0).length

  const stats = [
    { label: 'Products tracked', value: productCount,    Icon: Boxes,        color: 'text-slate-500',   bg: 'bg-slate-100'  },
    { label: 'In stock',         value: inStockCount,    Icon: PackageCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Low stock',        value: lowStockCount,   Icon: AlertTriangle,color: 'text-amber-600',   bg: 'bg-amber-50'   },
    { label: 'Out of stock',     value: outOfStockCount, Icon: PackageX,     color: 'text-rose-500',    bg: 'bg-rose-50'    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3"><div>
        <h2 className="text-xl font-bold text-slate-900">Inventory</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Track on-hand stock, reserved units, and reorder levels across all products and variants
        </p>
      </div><CsvExportButton filename="inventory" dateKey="updatedAt" columns={[{key:'productName',label:'Product'},{key:'variantName',label:'Variant'},{key:'variantSku',label:'SKU'},{key:'onHand',label:'On hand'},{key:'reserved',label:'Reserved'},{key:'available',label:'Available'},{key:'reorderThreshold',label:'Reorder at'},{key:'updatedAt',label:'Updated'}]} rows={stock} /></div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, Icon, color, bg }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex items-center gap-3 shadow-sm">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-[18px] h-[18px] ${color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800 leading-none">{value}</p>
              <p className="text-xs text-slate-400 mt-1 leading-snug">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Consumption rate */}
      {consumption && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900">Consumption Rate — last 30 days</h3>
          </div>
          <div className="flex items-end gap-8 mb-4">
            <div>
              <p className="text-2xl font-bold text-slate-800">{consumption.dailyRate}</p>
              <p className="text-xs text-slate-400 mt-0.5">units / day</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{consumption.totalUnits}</p>
              <p className="text-xs text-slate-400 mt-0.5">total units sold</p>
            </div>
          </div>
          {/* Sparkline bar chart */}
          {consumption.byDay.length > 0 && (() => {
            const max = Math.max(...consumption.byDay.map((d) => d.units), 1)
            return (
              <div className="flex items-end gap-0.5 h-12">
                {consumption.byDay.map((d) => (
                  <div
                    key={d.date}
                    title={`${d.date}: ${d.units} units`}
                    className="flex-1 bg-emerald-400 rounded-sm opacity-80 hover:opacity-100 transition-opacity"
                    style={{ height: `${Math.max(2, (d.units / max) * 100)}%` }}
                  />
                ))}
              </div>
            )
          })()}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <LocationManager initialLocations={locations} />

      <InventoryTable stock={stock} />
      <ActivityFeed logs={auditLogs} />
    </div>
  )
}
