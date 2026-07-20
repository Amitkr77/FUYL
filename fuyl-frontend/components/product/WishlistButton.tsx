'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Heart } from 'lucide-react'
import { useAuthStore } from '@/lib/store/authStore'
import { getWishlist, addToWishlist, removeFromWishlist } from '@/lib/api/customer'
import { Spinner } from '@/components/ui/Spinner'

interface WishlistButtonProps {
  productId: string
  variantId?: string
}

export function WishlistButton({ productId, variantId }: WishlistButtonProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { token, user } = useAuthStore()
  const [isWishlisted, setWishlisted] = useState(false)
  const [isLoading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) { setWishlisted(false); return }
    getWishlist(token)
      .then((items) => setWishlisted(items.some((i) => i.productId === productId)))
      .catch(() => {})
  }, [token, productId])

  const handleToggle = async () => {
    // "Logged in?" is keyed on the persisted user, not the token (which can be
    // momentarily absent right after a reload while it's re-minted).
    if (!user) {
      router.push(`/account?redirect=${encodeURIComponent(pathname)}`)
      return
    }
    let authToken = token
    if (!authToken) {
      await useAuthStore.getState().rehydrate()
      authToken = useAuthStore.getState().token
    }
    if (!authToken) {
      router.push(`/account?redirect=${encodeURIComponent(pathname)}`)
      return
    }
    setLoading(true)
    try {
      if (isWishlisted) {
        await removeFromWishlist(authToken, productId, variantId)
        setWishlisted(false)
      } else {
        await addToWishlist(authToken, productId, variantId)
        setWishlisted(true)
      }
    } catch {
      // Non-fatal — the button just doesn't visually update if the call failed.
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isLoading}
      aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      aria-pressed={isWishlisted}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border transition-colors disabled:opacity-60"
      style={{
        borderColor: isWishlisted ? 'var(--color-brand-berry)' : 'var(--color-brand-border)',
        background: isWishlisted ? 'var(--color-brand-berry)' : 'transparent',
      }}
    >
      {isLoading ? (
        <Spinner size={16} className={isWishlisted ? 'text-white' : 'text-brand-forest'} />
      ) : (
        <Heart
          size={18}
          className={isWishlisted ? 'text-white fill-current' : 'text-brand-forest'}
        />
      )}
    </button>
  )
}
