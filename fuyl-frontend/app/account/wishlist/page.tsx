'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/authStore'
import { useCartStore } from '@/lib/store/cartStore'
import { formatPrice } from '@/lib/utils/formatPrice'
import { getWishlist, removeFromWishlist, type WishlistItem } from '@/lib/api/customer'
import { getProductById } from '@/lib/api/products'
import { Skeleton } from '@/components/ui/Skeleton'
import { Spinner } from '@/components/ui/Spinner'
import type { Product } from '@/types/product'
import { getErrorMessage } from '@/lib/api/client'

interface WishlistRow extends WishlistItem {
  product: Product | null
}

function WishlistItemSkeleton() {
  return (
    <div className="border rounded-sm p-5 flex items-center gap-4" style={{ borderColor: 'var(--color-brand-border)' }}>
      <Skeleton className="w-16 h-16 shrink-0" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton className="h-3.5 w-2/3" />
        <Skeleton className="h-3.5 w-16" />
      </div>
      <div className="flex flex-col gap-2 items-end">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  )
}

export default function WishlistPage() {
  const { token, user } = useAuthStore()
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
      .catch((err) => setError(getErrorMessage(err, 'Failed to load wishlist')))
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
      setError(getErrorMessage(err, 'Failed to remove item'))
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
      useCartStore.getState().openCart()
    } finally {
      setBusyKey(null)
    }
  }

  if (!user) {
    return (
      <div className="container-brand section-py text-center">
        <p className="text-display-md font-display mb-4">SIGN IN TO VIEW YOUR WISHLIST</p>
        <Link href="/account" className="inline-flex items-center justify-center h-11 px-6 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest">
          Sign In
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-display-xl font-display mb-10">MY WISHLIST</h1>

      {isLoading && (
        <div className="flex flex-col gap-4" aria-busy="true" aria-label="Loading wishlist">
          {Array.from({ length: 3 }).map((_, i) => (
            <WishlistItemSkeleton key={i} />
          ))}
        </div>
      )}
      {!isLoading && error && (
        <p className="text-body-sm p-3 rounded-sm" style={{ background: '#FEE2E2', color: '#B91C1C' }}>{error}</p>
      )}
      {!isLoading && !error && rows.length === 0 && (
        <p className="text-body-md" style={{ color: 'var(--color-brand-muted)' }}>Your wishlist is empty.</p>
      )}

      {!isLoading && !error && rows.length > 0 && (
        <div className="flex flex-col gap-4 animate-fade-in">
          {rows.map((row) => {
            const busy = busyKey === keyOf(row)
            if (!row.product) {
              return (
                <div key={keyOf(row)} className="border rounded-sm p-5 flex items-center justify-between" style={{ borderColor: 'var(--color-brand-border)' }}>
                  <p className="text-body-sm" style={{ color: 'var(--color-brand-muted)' }}>This product is no longer available.</p>
                  <button onClick={() => handleRemove(row)} disabled={busy} className="flex items-center gap-1.5 text-body-xs font-semibold uppercase tracking-wide disabled:opacity-50" style={{ color: '#B91C1C' }}>
                    {busy && <Spinner size={12} />}
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
                  <Link href={`/products/${row.product.slug}`} className="text-body-sm font-semibold hover:text-brand-teal transition-colors">
                    {row.product.name}
                  </Link>
                  <p className="text-body-sm mt-1">{formatPrice(row.product.price)}</p>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <button
                    onClick={() => handleAddToCart(row, row.product!)}
                    disabled={busy || !row.product.available}
                    className="flex items-center justify-center gap-1.5 h-9 px-4 text-xs font-semibold uppercase tracking-widest bg-brand-forest text-white rounded-sm transition-colors hover:bg-brand-sage hover:text-brand-forest disabled:opacity-50 whitespace-nowrap"
                  >
                    {busy && <Spinner size={12} />}
                    {row.product.available ? 'Add to Cart' : 'Sold Out'}
                  </button>
                  <button onClick={() => handleRemove(row)} disabled={busy} className="text-body-xs font-semibold uppercase tracking-wide disabled:opacity-50" style={{ color: 'var(--color-brand-muted)' }}>
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
