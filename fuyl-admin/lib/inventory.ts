import { adminApiFetch, AdminApiError } from './api'

interface BackendStock {
  _id: string
  productId: string
  variantId?: string
  sellerId: string
  warehouseId: string
  onHand: number
  reserved: number
  available: number
  reorderThreshold: number
  reorderQuantity: number
  productName: string
  variantName: string | null
  variantSku: string | null
  updatedAt: string
}

export interface StockRow {
  id: string
  productId: string
  variantId?: string
  sellerId: string
  warehouseId: string
  productName: string
  variantName: string | null
  variantSku: string | null
  onHand: number
  reserved: number
  available: number
  reorderThreshold: number
  updatedAt: string
}

function mapStock(s: BackendStock): StockRow {
  return {
    id: s._id,
    productId: s.productId,
    variantId: s.variantId,
    sellerId: s.sellerId,
    warehouseId: s.warehouseId,
    productName: s.productName,
    variantName: s.variantName ?? null,
    variantSku: s.variantSku ?? null,
    onHand: s.onHand,
    reserved: s.reserved,
    available: s.available,
    reorderThreshold: s.reorderThreshold,
    updatedAt: s.updatedAt,
  }
}

export async function listInventory(): Promise<StockRow[]> {
  const raw = await adminApiFetch<BackendStock[]>('/admin/inventory?limit=200')
  const rows = raw.map(mapStock)
  const productsWithVariants = new Set(
    rows.filter((row) => Boolean(row.variantId)).map((row) => row.productId),
  )

  // Be defensive against older API deployments and legacy records: once a
  // product has variants, its former product-level stock row is not a variant
  // and must not be displayed or included in inventory totals.
  return rows.filter((row) => row.variantId || !productsWithVariants.has(row.productId))
}

export type AdjustmentType =
  | 'purchase' | 'return_in' | 'adjustment_in' | 'adjustment_out'
  | 'damage' | 'transfer_in' | 'transfer_out'

export interface AdjustStockInput {
  productId: string
  sellerId: string
  variantId?: string
  delta: number
  type: AdjustmentType
  note?: string
}

export async function adjustStock(input: AdjustStockInput): Promise<void> {
  await adminApiFetch('/inventory/adjust', { method: 'POST', body: input })
}

export interface WarehouseLocation {
  id: string
  name: string
  code: string
  address?: {
    line1?: string
    line2?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
  }
  isActive: boolean
  isDefault: boolean
}

interface BackendLocation {
  _id: string
  name: string
  code: string
  address?: WarehouseLocation['address']
  isActive: boolean
  isDefault: boolean
}

function mapLocation(l: BackendLocation): WarehouseLocation {
  return { id: l._id, name: l.name, code: l.code, address: l.address, isActive: l.isActive, isDefault: l.isDefault }
}

export async function listLocations(): Promise<WarehouseLocation[]> {
  const raw = await adminApiFetch<BackendLocation[]>('/inventory/locations')
  return raw.map(mapLocation)
}

export async function createLocation(data: { name: string; code: string; address?: WarehouseLocation['address']; isDefault?: boolean }): Promise<WarehouseLocation> {
  const raw = await adminApiFetch<BackendLocation>('/inventory/locations', { method: 'POST', body: data })
  return mapLocation(raw)
}

export async function updateLocation(id: string, data: Partial<WarehouseLocation>): Promise<WarehouseLocation> {
  const raw = await adminApiFetch<BackendLocation>(`/inventory/locations/${id}`, { method: 'PUT', body: data })
  return mapLocation(raw)
}

export async function deleteLocation(id: string): Promise<void> {
  await adminApiFetch(`/inventory/locations/${id}`, { method: 'DELETE' })
}

export interface ConsumptionStats {
  dailyRate: number
  totalUnits: number
  days: number
  byDay: Array<{ date: string; units: number }>
}

export async function getConsumptionStats(days = 30): Promise<ConsumptionStats> {
  return adminApiFetch<ConsumptionStats>(`/inventory/stats/consumption?days=${days}`)
}

export { AdminApiError }
