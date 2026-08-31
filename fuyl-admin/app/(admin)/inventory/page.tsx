import Link from 'next/link'
import { AlertCircle, Boxes, AlertTriangle, PackageX, PackageCheck } from 'lucide-react'
import { InventoryTable } from '@/components/inventory/InventoryTable'
import { LocationManager } from '@/components/inventory/LocationManager'
import { ConsumptionCard } from '@/components/inventory/ConsumptionCard'
import { LegacyDefaultBanner } from '@/components/inventory/LegacyDefaultBanner'
import { listInventory, getConsumptionStats, listLocations } from '@/lib/inventory'
import { getErrorMessage } from '@/lib/api'
import { CsvExportButton } from '@/components/ui/CsvExportButton'
import { ActivityFeed } from '@/components/ui/ActivityFeed'
import { getAuditLogs, type AuditLogEntry } from '@/lib/auditLog'

const VALID_PERIODS = [7, 14, 30] as const
type Period = (typeof VALID_PERIODS)[number]

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const params        = await searchParams
  const initialFilter = params.filter ?? 'all'
  const period: Period = VALID_PERIODS.includes(Number(params.period) as Period)
    ? (Number(params.period) as Period)
    : 30

  let stock: Awaited<ReturnType<typeof listInventory>> = []
  let consumption: Awaited<ReturnType<typeof getConsumptionStats>> | null = null
  let locations: Awaited<ReturnType<typeof listLocations>> = []
  let auditLogs: AuditLogEntry[] = []
  let error = ''
  try {
    ;[stock, consumption, locations, auditLogs] = await Promise.all([
      listInventory(),
      getConsumptionStats(period),
      listLocations(),
      getAuditLogs({ section: 'inventory', limit: 20 }).catch(() => []),
    ])
  } catch (err) {
    error = getErrorMessage(err, 'Could not load inventory.')
    try { stock = await listInventory() } catch { /* ignore */ }
  }

  // Detect "Legacy Default": stock rows with warehouseId='default' but no WarehouseLocation with that code
  const hasLegacyDefault = stock.some((s) => s.warehouseId === 'default') && !locations.some((l) => l.code === 'default')
  const defaultLocation  = locations.find((l) => l.isDefault) ?? null

  const productCount    = new Set(stock.map((s) => s.productId)).size
  const inStockCount    = stock.filter((s) => s.available > 0).length
  const lowStockCount   = stock.filter((s) => s.reorderThreshold > 0 && s.available > 0 && s.available <= s.reorderThreshold).length
  const outOfStockCount = stock.filter((s) => s.available === 0).length

  const stats = [
    { label: 'Products tracked', value: productCount,    Icon: Boxes,         color: 'text-slate-500',   bg: 'bg-slate-100',  href: '/inventory'            },
    { label: 'In stock',         value: inStockCount,    Icon: PackageCheck,  color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/inventory'            },
    { label: 'Low stock',        value: lowStockCount,   Icon: AlertTriangle, color: 'text-amber-600',   bg: 'bg-amber-50',   href: '/inventory?filter=low' },
    { label: 'Out of stock',     value: outOfStockCount, Icon: PackageX,      color: 'text-rose-500',    bg: 'bg-rose-50',    href: '/inventory?filter=out' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Inventory</h2>
          <p className="text-sm text-slate-500 mt-0.5">Track on-hand stock, reserved units, and reorder levels across all products and variants</p>
        </div>
        <CsvExportButton
          filename="inventory"
          dateKey="updatedAt"
          columns={[
            { key: 'productName',      label: 'Product'    },
            { key: 'variantName',      label: 'Variant'    },
            { key: 'variantSku',       label: 'SKU'        },
            { key: 'onHand',           label: 'On hand'    },
            { key: 'reserved',         label: 'Reserved'   },
            { key: 'available',        label: 'Available'  },
            { key: 'reorderThreshold', label: 'Reorder at' },
            { key: 'updatedAt',        label: 'Updated'    },
          ]}
          rows={stock}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, Icon, color, bg, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 flex items-center gap-3 shadow-sm hover:shadow-md hover:border-[#558476]/40 transition-all group"
          >
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
              <Icon className={`w-[18px] h-[18px] ${color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800 leading-none">{value}</p>
              <p className="text-xs text-slate-400 mt-1 leading-snug">{label}</p>
            </div>
          </Link>
        ))}
      </div>

      {hasLegacyDefault && (
        <LegacyDefaultBanner
          defaultLocationName={defaultLocation?.name ?? null}
          defaultLocationCode={defaultLocation?.code ?? null}
        />
      )}

      {consumption && (
        <ConsumptionCard consumption={consumption} stock={stock} period={period} />
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <LocationManager initialLocations={locations} />
      <InventoryTable stock={stock} locations={locations} initialFilter={initialFilter} />
      <ActivityFeed logs={auditLogs} />
    </div>
  )
}
