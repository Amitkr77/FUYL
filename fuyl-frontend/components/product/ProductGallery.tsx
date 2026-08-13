'use client'

import { useEffect, useState, useCallback, startTransition } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ProductImage } from '@/types/product'

interface ProductGalleryProps {
  images: ProductImage[]
  productName: string
}

const GRID_LIMIT = 6

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [active, setActive] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  // Portal target only exists client-side — rendering the lightbox through
  // document.body (rather than in place) is what actually fixes the
  // overlap: the gallery's "lg:sticky" wrapper on the PDP establishes its
  // own stacking context (position:sticky always does, per spec), which
  // trapped the lightbox's z-50 inside it — so it lost to the header and
  // even to later-in-DOM page content instead of covering everything.
  const [mounted, setMounted] = useState(false)
  useEffect(() => { startTransition(() => setMounted(true)) }, [])

  const prev = useCallback(() => setActive((i) => (i === 0 ? images.length - 1 : i - 1)), [images.length])
  const next = useCallback(() => setActive((i) => (i === images.length - 1 ? 0 : i + 1)), [images.length])

  useEffect(() => {
    if (!lightboxOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightboxOpen(false)
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [lightboxOpen, prev, next])

  // Lock background scroll while the lightbox is open — same pattern every
  // other overlay in this app uses (see Drawer.tsx). Without this, the rest
  // of the page keeps scrolling underneath the "fixed" lightbox, which is
  // exactly what caused the header/other sections to visually overlap it.
  useEffect(() => {
    document.body.style.overflow = lightboxOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [lightboxOpen])

  if (!images.length) return null

  const visible = images.slice(0, GRID_LIMIT)
  const extraCount = images.length - GRID_LIMIT

  const openAt = (i: number) => {
    setActive(i)
    setLightboxOpen(true)
  }

  return (
    <>
      {/* 2×3 grid */}
      <div className="grid grid-cols-2 gap-2">
        {visible.map((img, i) => {
          const showOverlay = i === GRID_LIMIT - 1 && extraCount > 0
          return (
            <button
              key={img.id}
              onClick={() => openAt(i)}
              aria-label={`View image ${i + 1}`}
              className="relative aspect-square rounded-sm overflow-hidden bg-[#F5EDE8] group"
            >
              <Image
                src={img.url}
                alt={img.altText || `${productName} ${i + 1}`}
                fill
                priority={i === 0}
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 1024px) 50vw, 25vw"
              />
              {showOverlay && (
                <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                  <span className="text-white text-lg font-semibold">
                    +{extraCount} more
                  </span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Lightbox — portaled to <body> so it escapes the sticky gallery
          wrapper's stacking context (see the note by `mounted` above). */}
      {lightboxOpen && mounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} image ${active + 1}`}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              setLightboxOpen(false)
            }}
            aria-label="Close"
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X size={20} />
          </button>

          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                prev()
              }}
              aria-label="Previous image"
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          )}

          <div
            className="relative w-full max-w-3xl h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[active].url}
              alt={images[active].altText || productName}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>

          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                next()
              }}
              aria-label="Next image"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          )}

          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5">
              {images.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-200',
                    i === active ? 'w-4 bg-white' : 'w-1.5 bg-white/40'
                  )}
                />
              ))}
            </div>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
