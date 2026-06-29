'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { Accordion } from '@/components/ui/Accordion'
import type { Product } from '@/types/product'

interface ProductTabsProps {
  product: Product
}

const TABS = ['Description', 'Ingredients', 'How to Use'] as const
type Tab = typeof TABS[number]

export function ProductTabs({ product }: ProductTabsProps) {
  const [active, setActive] = useState<Tab>('Description')

  // Hardcoded for FUYL COMPLETE+ — real data comes from backend
  const ingredientItems = [
    { id: '1', question: 'Spirulina — 500mg', answer: 'A blue-green algae powerhouse rich in protein, B-vitamins, iron and antioxidants. Supports energy, immunity and detoxification.' },
    { id: '2', question: 'Ashwagandha — 300mg', answer: 'Clinically studied adaptogen (KSM-66® extract) that helps reduce cortisol, improve stress resilience, and support thyroid function.' },
    { id: '3', question: 'Bacillus Coagulans — 2 Billion CFU', answer: 'A spore-forming probiotic strain that survives stomach acid to improve gut microbiome balance, digestion, and immunity.' },
    { id: '4', question: 'Vitamin D3 — 1000 IU', answer: 'Cholecalciferol form for superior absorption. Supports bone density, immune function, mood regulation and calcium metabolism.' },
    { id: '5', question: 'Omega-3 (ALA) — 250mg', answer: 'Plant-sourced alpha-linolenic acid from flaxseed. Supports cardiovascular health, inflammation control and brain function.' },
    { id: '6', question: 'Milk Thistle — 200mg', answer: 'Silymarin extract that supports liver cell regeneration and protects against oxidative damage — crucial for metabolic health.' },
    { id: '7', question: 'Amla — 500mg', answer: 'One of nature\'s richest sources of Vitamin C, supporting collagen synthesis, immune defence, and iron absorption.' },
    { id: '8', question: 'Digestive Enzyme Blend — 100mg', answer: 'Protease, amylase, lipase and cellulase work together to improve macronutrient breakdown and reduce bloating.' },
    { id: '9', question: 'Magnesium Glycinate — 100mg', answer: 'Highly bioavailable form of magnesium. Supports muscle recovery, sleep quality, nerve function and blood sugar regulation.' },
  ]

  return (
    <div className="mt-10">
      {/* Tab bar */}
      <div className="flex border-b" style={{ borderColor: 'var(--color-brand-border)' }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={cn(
              'px-4 py-3 text-label transition-colors duration-150 border-b-2 -mb-px',
              active === tab
                ? 'text-[#8B1A4A] border-[#8B1A4A]'
                : 'text-[#6B6B6B] border-transparent hover:text-[#0A0A0A]'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="py-6">
        {active === 'Description' && (
          <div
            className="prose prose-sm max-w-none text-body-md leading-relaxed"
            dangerouslySetInnerHTML={{ __html: product.description || '<p>No description available.</p>' }}
          />
        )}

        {active === 'Ingredients' && (
          <div>
            <p className="text-body-sm mb-4" style={{ color: 'var(--color-brand-muted)' }}>
              60+ research-backed ingredients. Tap each to learn more.
            </p>
            <Accordion items={ingredientItems} allowMultiple />
          </div>
        )}

        {active === 'How to Use' && (
          <div className="space-y-4">
            {[
              { step: '01', title: 'Morning ritual', body: 'Take one sachet every morning, ideally before or with breakfast.' },
              { step: '02', title: 'Mix it up', body: 'Mix the powder into 200ml of cold water, juice, smoothie or milk. Stir well for 20 seconds.' },
              { step: '03', title: 'Consistency is key', body: 'For best results, take FUYL COMPLETE+ daily for at least 30 days to allow the adaptogenic and probiotic ingredients to take full effect.' },
            ].map(({ step, title, body }) => (
              <div key={step} className="flex gap-4">
                <span
                  className="text-display-md font-display shrink-0 w-12 leading-none"
                  style={{ color: 'var(--color-brand-berry)' }}
                >
                  {step}
                </span>
                <div>
                  <p className="font-semibold text-body-md">{title}</p>
                  <p className="text-body-sm mt-1" style={{ color: 'var(--color-brand-muted)' }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
