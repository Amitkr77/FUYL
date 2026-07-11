'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/authStore'
import { useCartStore } from '@/lib/store/cartStore'
import { formatPrice } from '@/lib/utils/formatPrice'
import { getWishlist, removeFromWishlist, type WishlistItem } from '@/lib/api/customer'
import { getProductById } from '@/lib/api/products'
import type { Product } from '@/types/product'

interface WishlistRow extends WishlistItem {
  product: Product | null
}

export default function WishlistPage() {
  const { token } = useAuthStore()
  const addItem = useCartStore((s) => s.addItem)
  const [rows, setRows]         = useState<WishlistRow[]>([])
  const [isLoading, setLoading] = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [busyKey, setBusyKey]   = useState<string | null>(null)

  const load = () => {
    if (!token) return
    setLoading(true)
    getWishlist(token)
      .then(async (items) => {
        const products = await Promise.all(items.map((i) => getProductById(i.productId)))
        setRows(items.map((i, idx) => ({ ...i, product: products[idx] })))
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load wishlist'))
      .finally(() => setLoading(false))
  }

  useEffect(load, [token])

  const keyOf = (i: WishlistItem) => `${i.productId}-${i.variantId ?? ''}`

  const handleRemove = async (item: WishlistItem) => {
    if (!token) return
    setBusyKey(keyOf(item))
    try {
      await removeFromWishlist(token, item.productId, item.variantId)
      setRows((r) => r.filter((row) => keyOf(row) !== keyOf(item)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove item')
    } finally {
      setBusyKey(null)
    }
  }

  const handleAddToCart = async (item: WishlistItem, product: Product) => {
    setBusyKey(keyOf(item))
    try {
      await addItem({
        productId: item.productId,
        variantId: item.variantId ?? product.variants[0]?.id,
        quantity: 1,
      })
    } finally {
      setBusyKey(null)
    }
  }

  if (!token) {
    return (
      <div className="container-brand section-py text-center">
        <p className="text-display-md font-display mb-4">SIGN IN TO VIEW YOUR WISHLIST</p>
        <Link href="/account" className="inline-flex items-center justify-center h-11 px-6 text-xs font-semibold uppercase tracking-widest bg-[#8B1A4A] text-white rounded-sm hover:bg-[#C4526A] transition-colors">
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div className="container-brand section-py max-w-2xl mx-auto">
      <h1 className="text-display-xl font-display mb-10">MY WISHLIST</h1>

      {isLoading && <p className="text-body-md" style={{ color: 'var(--color-brand-muted)' }}>Loading wishlist…</p>}
      {!isLoading && error && (
        <p className="text-body-sm p-3 rounded-sm" style={{ background: '#FEE2E2', color: '#B91C1C' }}>{error}</p>
      )}
      {!isLoading && !error && rows.length === 0 && (
        <p className="text-body-md" style={{ color: 'var(--color-brand-muted)' }}>Your wishlist is empty.</p>
      )}

      {!isLoading && !error && rows.length > 0 && (
        <div className="flex flex-col gap-4">
          {rows.map((row) => {
            const busy = busyKey === keyOf(row)
            if (!row.product) {
              return (
                <div key={keyOf(row)} className="border rounded-sm p-5 flex items-center justify-between" style={{ borderColor: 'var(--color-brand-border)' }}>
                  <p className="text-body-sm" style={{ color: 'var(--color-brand-muted)' }}>This product is no longer available.</p>
                  <button onClick={() => handleRemove(row)} disabled={busy} className="text-body-xs font-semibold uppercase tracking-wide" style={{ color: '#B91C1C' }}>
                    Remove
                  </button>
                </div>
              )
            }
            return (
              <div key={keyOf(row)} className="border rounded-sm p-5 flex items-center gap-4" style={{ borderColor: 'var(--color-brand-border)' }}>
                <Link href={`/products/${row.product.slug}`} className="flex-shrink-0">
                  {row.product.images[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.product.images[0].url} alt={row.product.name} className="w-16 h-16 object-cover rounded-sm" />
                  )}
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/products/${row.product.slug}`} className="text-body-sm font-semibold hover:text-[#8B1A4A] transition-colors">
                    {row.product.name}
                  </Link>
                  <p className="text-body-sm mt-1">{formatPrice(row.product.price)}</p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <button
                    onClick={() => handleAddToCart(row, row.product!)}
                    disabled={busy || !row.product.available}
                    className="h-9 px-4 text-xs font-semibold uppercase tracking-widest bg-[#8B1A4A] text-white rounded-sm hover:bg-[#C4526A] transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {row.product.available ? 'Add to Cart' : 'Sold Out'}
                  </button>
                  <button onClick={() => handleRemove(row)} disabled={busy} className="text-body-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-brand-muted)' }}>
                    Remove
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
