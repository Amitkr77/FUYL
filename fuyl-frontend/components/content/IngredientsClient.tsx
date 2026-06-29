'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { IngredientCard } from './IngredientCard'
import type { IngredientData } from './IngredientCard'

const TAB_IMAGES: Record<string, string> = {
  'Adaptogens & Stress':     '/images/ingredients/first-tab.webp',
  'Probiotics & Gut':        '/images/ingredients/second-tab.webp',
  'Energy & Vitality':       '/images/ingredients/third-tab.webp',
  'Immunity & Antioxidants': '/images/ingredients/fourth-tab.webp',
}

interface Props {
  categories:  string[]
  ingredients: IngredientData[]
}

export function IngredientsClient({ categories, ingredients }: Props) {
  const [activeTab,     setActiveTab]     = useState('View All')
  const [sidebarOpen,   setSidebarOpen]   = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)

  const allTabs = ['View All', ...categories]

  const filtered = activeTab === 'View All'
    ? ingredients
    : ingredients.filter(i => i.category === activeTab)

  const selected = filtered[selectedIndex]

  function selectTab(tab: string) {
    setActiveTab(tab)
    setSelectedIndex(0)
    setSidebarOpen(false)
  }

  function openCard(index: number) {
    setSelectedIndex(index)
    setSidebarOpen(true)
  }

  const goPrev = useCallback(() =>
    setSelectedIndex(i => Math.max(0, i - 1)),
  [])

  const goNext = useCallback(() =>
    setSelectedIndex(i => Math.min(filtered.length - 1, i + 1)),
  [filtered.length])

  /* Keyboard navigation */
  useEffect(() => {
    if (!sidebarOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')      { setSidebarOpen(false); return }
      if (e.key === 'ArrowLeft')   goPrev()
      if (e.key === 'ArrowRight')  goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sidebarOpen, goPrev, goNext])

  /* Lock body scroll while sidebar is open */
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  return (
    <>
      {/* ── Pill Tabs ─────────────────────────────────────── */}
      <section style={{ background: 'var(--color-brand-cream)' }}>
        <div className="container-brand py-6">
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' } as React.CSSProperties}
          >
            {allTabs.map(tab => {
              const img    = TAB_IMAGES[tab]
              const active = activeTab === tab
              return (
                <button
                  key={tab}
                  onClick={() => selectTab(tab)}
                  className={cn(
                    'shrink-0 flex items-center gap-2 px-4! py-2! rounded-full border text-body-xs font-semibold uppercase tracking-widest transition-all duration-200',
                    active
                      ? 'border-transparent shadow-sm'
                      : 'hover:border-[var(--color-brand-teal)] hover:text-[var(--color-brand-teal)]'
                  )}
                  style={
                    active
                      ? { background: 'var(--color-brand-forest)', color: '#fff' }
                      : { borderColor: 'var(--color-brand-border)', color: 'var(--color-brand-muted)' }
                  }
                >
                  {img && (
                    <span className="relative w-5 h-5 rounded-full overflow-hidden shrink-0">
                      <Image src={img} alt="" fill className="object-cover" sizes="20px" />
                    </span>
                  )}
                  {tab}
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Card Grid ─────────────────────────────────────── */}
      <section className="section-py" style={{ background: 'var(--color-brand-white)' }}>
        <div className="container-brand">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((ingredient, i) => (
              <div
                key={`${ingredient.id}-${activeTab}`}
                className="animate-fade-up"
                style={{ animationDelay: `${Math.min(i * 40, 400)}ms`, animationFillMode: 'both' }}
              >
                <IngredientCard
                  ingredient={ingredient}
                  onClick={() => openCard(i)}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sidebar Drawer ────────────────────────────────── */}
      {sidebarOpen && selected && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            style={{
              background: 'rgba(18, 41, 31, 0.55)',
              backdropFilter: 'blur(2px)',
              animation: 'fadeIn 0.25s ease forwards',
            }}
            onClick={() => setSidebarOpen(false)}
          />

          {/* Drawer panel */}
          <aside
            className="fixed right-0 top-0 h-full z-50 flex flex-col shadow-2xl"
            style={{
              width: 'min(100vw, 440px)',
              background: 'var(--color-brand-white)',
              animation: 'slideInRight 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards',
            }}
            role="dialog"
            aria-modal="true"
            aria-label={selected.name}
          >
            {/* Close button */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full transition-colors hover:bg-black/10"
              style={{ background: 'rgba(0,0,0,0.06)' }}
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>

            {/* Large emoji / image area */}
            <div
              className="w-full shrink-0 flex items-center justify-center transition-colors duration-300"
              style={{ background: selected.bg, height: '240px' }}
            >
              <span
                className="leading-none select-none"
                style={{ fontSize: '5.5rem' }}
              >
                {selected.emoji}
              </span>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-7 space-y-5">
              {/* Category tag */}
              <span
                className="inline-block text-label px-3 py-1 rounded-full"
                style={{ background: selected.bg, color: selected.accent }}
              >
                {selected.category}
              </span>

              {/* Title & dose */}
              <div>
                <h2 className="text-display-md font-display leading-tight">
                  {selected.name.toUpperCase()}
                </h2>
                <p className="text-label mt-2" style={{ color: selected.accent }}>
                  {selected.amount} per sachet
                </p>
              </div>

              {/* Description */}
              <p className="text-body-md leading-relaxed" style={{ color: 'var(--color-brand-muted)' }}>
                {selected.description}
              </p>

              {/* Clinical backing */}
              {selected.clinical && (
                <div
                  className="p-4 rounded-sm space-y-1"
                  style={{ background: 'var(--color-brand-cream)' }}
                >
                  <p
                    className="font-semibold uppercase tracking-widest"
                    style={{ fontSize: '0.625rem', color: selected.accent }}
                  >
                    Clinical Backing
                  </p>
                  <p className="text-body-xs leading-relaxed" style={{ color: 'var(--color-brand-muted)' }}>
                    {selected.clinical}
                  </p>
                </div>
              )}
            </div>

            {/* Prev / Next navigation */}
            <div
              className="shrink-0 flex items-center justify-between px-7 py-4 border-t"
              style={{ borderColor: 'var(--color-brand-border)' }}
            >
              <button
                onClick={goPrev}
                disabled={selectedIndex === 0}
                className="flex items-center gap-1.5 text-body-xs font-semibold uppercase tracking-widest transition-opacity disabled:opacity-25 hover:not-disabled:text-[var(--color-brand-teal)]"
              >
                <ChevronLeft size={15} />
                Prev
              </button>

              <span className="text-body-xs tabular-nums" style={{ color: 'var(--color-brand-muted)' }}>
                {selectedIndex + 1} / {filtered.length}
              </span>

              <button
                onClick={goNext}
                disabled={selectedIndex === filtered.length - 1}
                className="flex items-center gap-1.5 text-body-xs font-semibold uppercase tracking-widest transition-opacity disabled:opacity-25 hover:not-disabled:text-[var(--color-brand-teal)]"
              >
                Next
                <ChevronRight size={15} />
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  )
}
