'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { ProductImage } from '@/types/product'

interface ProductGalleryProps {
  images: ProductImage[]
  productName: string
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [active, setActive] = useState(0)

  const prev = () => setActive((i) => (i === 0 ? images.length - 1 : i - 1))
  const next = () => setActive((i) => (i === images.length - 1 ? 0 : i + 1))

  if (!images.length) return null

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-4">
      {/* Thumbnails — vertical on desktop, horizontal strip on mobile */}
      {images.length > 1 && (
        <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto lg:max-h-[600px] shrink-0">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              className={cn(
                'relative shrink-0 w-16 h-16 lg:w-20 lg:h-20 rounded-sm overflow-hidden border-2 transition-all duration-150',
                i === active
                  ? 'border-[#8B1A4A]'
                  : 'border-transparent hover:border-[#E8E0D8]'
              )}
            >
              <Image
                src={img.url}
                alt={img.altText || `${productName} ${i + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main image */}
      <div className="relative flex-1 aspect-square bg-[#F5EDE8] rounded-sm overflow-hidden group">
        <Image
          src={images[active].url}
          alt={images[active].altText || productName}
          fill
          priority={active === 0}
          className="object-cover transition-opacity duration-300"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />

        {/* Navigation arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={next}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
            >
              <ChevronRight size={18} />
            </button>

            {/* Dot indicators on mobile */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 lg:hidden">
              {images.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  aria-label={`Go to image ${i + 1}`}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-200',
                    i === active ? 'w-4 bg-[#8B1A4A]' : 'w-1.5 bg-white/60'
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
