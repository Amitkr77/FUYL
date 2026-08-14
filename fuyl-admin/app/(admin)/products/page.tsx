import Link from 'next/link'
import { Plus, AlertCircle, Package, TrendingUp, AlertTriangle, PackageX } from 'lucide-react'
import { ProductsTable } from '@/components/products/ProductsTable'
import { listAdminProducts } from '@/lib/products'
import { getErrorMessage } from '@/lib/api'
import { CsvExportButton } from '@/components/ui/CsvExportButton'

export default async function ProductsPage() {
  let products: Awaited<ReturnType<typeof listAdminProducts>> = []
  let error = ''
  try {
    products = await listAdminProducts()
  } catch (err) {
    error = getErrorMessage(err, 'Could not load products.')
  }

  const activeCount    = products.filter((p) => p.status === 'active' && p.isPublished).length
  const lowStockCount  = products.filter((p) => p.stock > 0 && p.stock < 20).length
  const outOfStockCount = products.filter((p) => p.stock === 0).length

  const stats = [
    { label: 'Total Products',     value: products.length, Icon: Package,       color: 'text-slate-500',   bg: 'bg-slate-100'   },
    { label: 'Active & Published', value: activeCount,     Icon: TrendingUp,    color: 'text-emerald-600', bg: 'bg-emerald-50'  },
    { label: 'Low Stock',          value: lowStockCount,   Icon: AlertTriangle, color: 'text-amber-600',   bg: 'bg-amber-50'    },
    { label: 'Out of Stock',       value: outOfStockCount, Icon: PackageX,      color: 'text-rose-500',    bg: 'bg-rose-50'     },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Products</h2>
          <p className="text-sm text-slate-500 mt-0.5">Manage your product catalog, pricing, and variants</p>
        </div>
        <div className="flex items-center gap-2"><CsvExportButton filename="products" columns={[{key:'name',label:'Product'},{key:'status',label:'Status'},{key:'price',label:'Price'},{key:'stock',label:'Stock'},{key:'sku',label:'SKU'}]} rows={products} /><Link
          href="/products/new"
          className="flex items-center gap-2 px-4 py-2 bg-[#558476] hover:bg-[#457366] text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </Link></div>
      </div>

      {/* Quick stats */}
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

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <ProductsTable products={products} />
    </div>
  )
}
