'use client'

import Link from 'next/link'
import { useAuthStore } from '@/lib/store/authStore'
import { formatPrice } from '@/lib/utils/formatPrice'

const STATUS_COLORS: Record<string, string> = {
  pending:   '#F59E0B',
  confirmed: '#3B82F6',
  shipped:   '#8B1A4A',
  delivered: '#10B981',
  cancelled: '#6B7280',
}

export default function OrdersPage() {
  const { token } = useAuthStore()

  if (!token) {
    return (
      <div className="container-brand section-py text-center">
        <p className="text-display-md font-display mb-4">SIGN IN TO VIEW ORDERS</p>
        <Link href="/account" className="inline-flex items-center justify-center h-11 px-6 text-xs font-semibold uppercase tracking-widest bg-[#8B1A4A] text-white rounded-sm hover:bg-[#C4526A] transition-colors">
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div className="container-brand section-py max-w-2xl mx-auto">
      <h1 className="text-display-xl font-display mb-10">MY ORDERS</h1>
      <p className="text-body-md" style={{ color: 'var(--color-brand-muted)' }}>
        Order history will appear here once connected to the backend.
      </p>
    </div>
  )
}
