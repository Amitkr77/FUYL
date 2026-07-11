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
  updatedAt: string
}

export interface StockRow {
  id: string
  productId: string
  variantId?: string
  sellerId: string
  warehouseId: string
  productName: string
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
    onHand: s.onHand,
    reserved: s.reserved,
    available: s.available,
    reorderThreshold: s.reorderThreshold,
    updatedAt: s.updatedAt,
  }
}

export async function listInventory(): Promise<StockRow[]> {
  const raw = await adminApiFetch<BackendStock[]>('/admin/inventory?limit=200')
  return raw.map(mapStock)
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

export { AdminApiError }
