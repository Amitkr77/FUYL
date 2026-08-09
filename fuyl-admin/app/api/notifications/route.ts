import { NextResponse } from 'next/server'
import { listAdminOrders } from '@/lib/orders'

/**
 * GET /api/notifications
 * Server-side route so the TopBar client component can fetch pending orders
 * without needing to duplicate auth/token logic client-side.
 */
export async function GET() {
  try {
    const all = await listAdminOrders()
    const pending = all
      .filter((o) => o.status === 'pending')
      .slice(0, 6)
      .map((o) => ({
        id:          o.id,
        orderNumber: o.orderNumber,
        customer:    o.customerName,
        amount:      o.total,
        date:        o.date,
      }))
    return NextResponse.json({ pending, total: all.filter((o) => o.status === 'pending').length })
  } catch {
    return NextResponse.json({ pending: [], total: 0 })
  }
}
