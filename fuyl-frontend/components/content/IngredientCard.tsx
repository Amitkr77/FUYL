'use client'

import Image from 'next/image'
import { ArrowRight } from 'lucide-react'

export interface IngredientData {
  id:          string
  name:        string
  amount?:     string
  benefit:     string
  description: string
  emoji:       string
  category:    string
  bg:          string
  accent:      string
  clinical?:   string
  image?:      string
}

interface IngredientCardProps {
  ingredient: IngredientData
  onClick:    () => void
}

export function IngredientCard({ ingredient, onClick }: IngredientCardProps) {
  const { name, amount, benefit, emoji, bg, accent, image } = ingredient

  return (
    <button
      onClick={onClick}
      className="group w-full text-left flex flex-col rounded-sm border overflow-hidden transition-all duration-250 hover:-translate-y-1 hover:shadow-lg"
      style={{ borderColor: 'var(--color-brand-border)' }}
      aria-label={`Learn more about ${name}`}
    >
      {/* Image area */}
      <div
        className="relative w-full aspect-square overflow-hidden transition-transform duration-300 group-hover:scale-105"
        style={{ background: bg }}
      >
        {image ? (
          <Image
            src={image}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-5xl select-none">{emoji}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div
        className="p-4 flex flex-col gap-1 flex-1"
        style={{ background: 'var(--color-brand-white)' }}
      >
        <p className="text-body-sm font-semibold leading-snug">{name}</p>
        {amount && (
          <p className="text-body-xs font-medium" style={{ color: accent }}>{amount}</p>
        )}
        <div className="flex items-end justify-between mt-auto pt-2 gap-2">
          <p className="text-body-xs" style={{ color: 'var(--color-brand-muted)' }}>{benefit}</p>
          <ArrowRight
            size={14}
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: accent }}
          />
        </div>
      </div>
    </button>
  )
}
